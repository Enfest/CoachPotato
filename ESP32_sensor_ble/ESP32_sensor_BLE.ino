// modify these two parameters for different modes and device name
#define DEVICE_NAME "coachP_il"
#define MODE 2
/**
  --- device name ---
  coachP_wl
  coachP_wr
  coachP_il
  coachP_ir

  --- mode --- 
  0 for test
  1 for weight
  2 for imu
*/

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#if MODE == 1
#include "weight.h"
#elif MODE == 2
#include "imu.h"
#endif

#define LED_PIN 2

// See the following for generating UUIDs:
// https://www.uuidgenerator.net/

#define SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#if MODE == 1
#define CHAR_UUID    "cfbacaaa-0e61-4feb-9601-edb8f5def59c" // for weight
#elif MODE == 2
#define CHAR_UUID   "5bb7d416-9fdc-4931-a8e1-4b8c884b2216" // for imu
#endif

BLEServer *pServer = NULL;
BLECharacteristic *pCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;


#if MODE == 0
uint8_t test = 0;
void send_test(uint8_t *pw){
  pCharacteristic->setValue((uint8_t *)pw, 4);
  pCharacteristic->notify();
}
#elif MODE == 1 //weight
float weight = 0;
void read_send_weight(){
  read_weight(&weight);
  uint8_t buffer[4];
  memcpy(buffer, &weight, sizeof(weight));
  pCharacteristic->setValue(buffer, 4);
}
#elif MODE == 2
void read_send_imu(){
  float all = read_abs_acc();
  uint8_t value = all > moving_threshold ? 1 : 0;
  pCharacteristic->setValue(&value, 1);
}
#endif


class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *pServer) {
    deviceConnected = true;
    BLEDevice::startAdvertising();
  };

  void onDisconnect(BLEServer *pServer) {
    deviceConnected = false;
  }
};



void setup() {
  Serial.begin(115200);
  
#if MODE == 1
  weight_setup();
#elif MODE == 2
  imu_wire_setup();
#endif

  // Create the BLE Device
  BLEDevice::init(DEVICE_NAME);

  // Create the BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Create the BLE Service
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Create a BLE Characteristic
  pCharacteristic = pService->createCharacteristic(
    CHAR_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_INDICATE
  );

  // https://www.bluetooth.com/specifications/gatt/viewer?attributeXmlFile=org.bluetooth.descriptor.gatt.client_characteristic_configuration.xml
  // Create a BLE Descriptor
  pCharacteristic->addDescriptor(new BLE2902());

  // Start the service
  pService->start();

  // Start advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x0);  // set value to 0x00 to not advertise this parameter
  BLEDevice::startAdvertising();
  Serial.println("Waiting a client connection to notify...");

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
}

void loop() {
  // when connected
  if (deviceConnected) {
#if MODE == 0
    send_test(&test);
    test++;

#elif MODE == 1
    read_send_weight();

#elif MODE == 2
    read_send_imu();

#endif
    delay(100);
  }

  // disconnecting
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);                   // give the bluetooth stack the chance to get things ready
    pServer->startAdvertising();  // restart advertising
    Serial.println("start advertising");
    oldDeviceConnected = deviceConnected;
    digitalWrite(LED_PIN, LOW);
  }
  // connecting
  if (deviceConnected && !oldDeviceConnected) {
#if MODE == 1
    tare();
#endif
    Serial.println("connected");
    oldDeviceConnected = deviceConnected;
    digitalWrite(LED_PIN, HIGH);
  }
}
