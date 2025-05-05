/*
   -------------------------------------------------------------------------------------
   HX711_ADC
   Arduino library for HX711 24-Bit Analog-to-Digital Converter for Weight Scales
   Olav Kallhovd sept2017
   -------------------------------------------------------------------------------------
*/

/*
   Settling time (number of samples) and data filtering can be adjusted in the config.h file
   For calibration and storing the calibration value in eeprom, see example file "Calibration.ino"

   The update() function checks for new data and starts the next conversion. In order to acheive maximum effective
   sample rate, update() should be called at least as often as the HX711 sample rate; >10Hz@10SPS, >80Hz@80SPS.
   If you have other time consuming code running (i.e. a graphical LCD), consider calling update() from an interrupt routine,
   see example file "Read_1x_load_cell_interrupt_driven.ino".

   This is an example sketch on how to use this library
*/

#include <HX711_ADC.h>
#if defined(ESP8266)|| defined(ESP32) || defined(AVR)
#include <EEPROM.h>
#endif

// pins:
const int HX711_dout = 12; //mcu > HX711 dout pin
const int HX711_sck = 13; //mcu > HX711 sck pin

// HX711 constructor:
HX711_ADC LoadCell(HX711_dout, HX711_sck);

// custom variables
const int calVal_eepromAdress = 0;
unsigned long t = 0;
// check if new data ready
static boolean newDataReady = 0;

void weight_setup() {
  // initialize
  // Serial.begin(57600); 
  delay(10);
  Serial.println();
  Serial.println("Starting weight module...");

  LoadCell.begin();
  //LoadCell.setReverseOutput(); //uncomment to turn a negative output value to positive
  float calibrationValue; // calibration value (see example file "Calibration.ino")
  calibrationValue = 696.0; // uncomment this if you want to set the calibration value in the sketch

  #if defined(ESP8266)|| defined(ESP32)
  //EEPROM.begin(512); // uncomment this if you use ESP8266/ESP32 and want to fetch the calibration value from eeprom
  #endif
  //EEPROM.get(calVal_eepromAdress, calibrationValue); // uncomment this if you want to fetch the calibration value from eeprom

  // initialize and tare load cell
  unsigned long stabilizingtime = 2000; // preciscion right after power-up can be improved by adding a few seconds of stabilizing time
  boolean _tare = true; //set this to false if you don't want tare to be performed in the next step
  LoadCell.start(stabilizingtime, _tare);
  if (LoadCell.getTareTimeoutFlag()) {
    Serial.println("Timeout, check MCU>HX711 wiring and pin designations");
    while (1);
  }
  else {
    LoadCell.setCalFactor(calibrationValue); // set calibration value (float)
    Serial.println("Startup is complete");
  }

  // for testing, can ignore this
  // pinMode(LED_BUILTIN, OUTPUT);  // Initialize the LED_BUILTIN pin as an output
}

// void loop() {
  
//   float weight = read_weight();
//   Serial.println("Weight: ", weight);
//   delay(100);

// }

void read_weight(float *pFloat){
  // check for new data/start next conversion:
  if (LoadCell.update()) newDataReady = true;

  // get smoothed value from the dataset:
  if (newDataReady) {
    float i = LoadCell.getData();
    newDataReady = 0;
    *pFloat = i;
    
  }
  // Serial.print("Weight: ");
  // Serial.println(*pFloat, 2);
  // }else{
    // return 0.0;
  // }
  return;
}

void tare(){
  LoadCell.tareNoDelay();
  // check if last tare operation is complete:
  unsigned long int t = millis();
  while (LoadCell.getTareStatus() != true){
    LoadCell.update();
    if(millis() > t + 30000){
      Serial.println("Tare timeout");
      return;
    }
  }
  Serial.println("Tare complete");
  return;
}