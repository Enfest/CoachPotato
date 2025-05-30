import argparse
import asyncio

from bleak import BleakScanner


async def main(args: argparse.Namespace):
    print("scanning for 5 seconds, please wait...")

    devices = await BleakScanner.discover(
        return_adv=True,
        service_uuids=args.services,
        cb=dict(use_bdaddr=args.macos_use_bdaddr),
    )

    for d, a in devices.values():
        print()
        print(d)
        print("-" * len(str(d)))
        print(a)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--services",
        metavar="<uuid>",
        nargs="*",
        help="UUIDs of one or more services to filter for",
    )

    parser.add_argument(
        "--macos-use-bdaddr",
        action="store_true",
        help="when true use Bluetooth address instead of UUID on macOS",
    )

    args = parser.parse_args()

    asyncio.run(main(args))
