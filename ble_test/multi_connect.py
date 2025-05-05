import argparse
import asyncio
import contextlib
import logging
from typing import Iterable
from bleak import BleakClient, BleakScanner
import struct

lock = asyncio.Lock()
CHAR_UUID_W = "cfbacaaa-0e61-4feb-9601-edb8f5def59c"
CHAR_UUID_I = "5bb7d416-9fdc-4931-a8e1-4b8c884b2216"

class BLE:
    def __init__(self, name, char_uuid):
        self.name = name
        self.char_uuid = char_uuid
        self.connected = False
        self.notifying = False
        self.client = None

    async def connect(self, lock):

        logging.info("starting %s task", self.name)

        try:
            async with contextlib.AsyncExitStack() as stack:

				# use lock to avoid connection at the same time.
                async with lock:

                    # scan for the device
                    logging.info("scanning for %s", self.name)
                    device = await BleakScanner.find_device_by_name(self.name)
                    logging.info("stopped scanning for %s", self.name)

                    if device is None:
                        logging.error("%s not found", self.name)
                        return

                    # setup disconnect callback
                    disconnected_event = asyncio.Event()

                    def disconnected_callback(client):
                        logging.info("Disconnected callback called!")
                        disconnected_event.set()


                    # connect to the device
                    self.client = BleakClient(device, disconnected_callback=disconnected_callback)
                    logging.info("connecting to %s", self.name)
                    await stack.enter_async_context(self.client)
                    logging.info("connected to %s", self.name)
                    self.connected = True

                    stack.callback(logging.info, "disconnecting from %s", self.name)

                # The lock is released here.
                await disconnected_event.wait()

        except Exception:
            logging.exception("error with %s", self.name)

    async def startNotify(self, notify_uuid, callback):
        # def example_callback(_, data):
            # logging.info("%s received %r", name, data)
        await self.client.start_notify(notify_uuid, callback)
        logging.info("%s start notify mode", self.name)

    async def stopNotify(self, notify_uuid):
        await self.client.stop_notify(notify_uuid)
        logging.info("%s stop notify mode", self.name)

    async def getRaw(self):
        data = await self.client.read_gatt_char(self.char_uuid)
        return data

    async def disconnect(self):
        await self.client.disconnect()




async def main(sensors):
    ESPs = [BLE(esp["name"], esp["char_uuid"]) for esp in sensors]

    # await asyncio.gather(*(esp.connect(lock) for esp in ESPs))
    connect_tasks = [asyncio.create_task(esp.connect(lock)) for esp in ESPs]

    # Wait for all devices to report they're connected
    while not all(esp.connected for esp in ESPs):
        await asyncio.sleep(0.1)

    for _ in range(1000):
        results = await asyncio.gather(*(esp.getRaw() for esp in ESPs))
        for name, data in zip((esp.name for esp in ESPs), results):
            # print(f"{name}: {data}")
            force = struct.unpack('f', data)[0]
            print(f"{name}: {force}")
        await asyncio.gather(*(esp.getRaw() for esp in ESPs))
        await asyncio.sleep(0.1)

    await asyncio.gather(*(esp.disconnect() for esp in ESPs))


if __name__ == "__main__":

    # log_level = logging.DEBUG if args.debug else logging.INFO
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)-15s %(name)-8s %(levelname)s: %(message)s",
    )

    asyncio.run(
        main(
            sensors = [
                {"name": "coachP_wl", "char_uuid": CHAR_UUID_W},
                # {"name": "coachP_wr", "char_uuid": CHAR_UUID_W}
            ]
        )
    )
