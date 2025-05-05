import asyncio
from bleak import BleakClient, BleakScanner

name = "coachP_weight_left"
CHAR_UUID = "cfbacaaa-0e61-4feb-9601-edb8f5def59c"

def callback(sender, data):
    print(f"{sender}: {data}")

async def main(name):
    device = await BleakScanner.find_device_by_name(name)
    client = BleakClient(device)
    try:
        await client.connect()
        # data = await client.read_gatt_char(CHAR_UUID)
        # print("received data:")
        # print(data)
        await client.start_notify(CHAR_UUID, callback)
        await asyncio.Event().wait()
    except Exception as e:
        print(e)
    finally:
        await client.disconnect()

asyncio.run(main(name))
