#include <Wire.h>  // Wire library - used for I2C communication
int ADXL345 = 0x53; // The ADXL345 sensor I2C address

// user parameters
float moving_threshold = 1.02;

void imu_wire_setup() {
  // Initiate serial communication
  // Serial.begin(9600);  

  // Initiate the Wire library
  Wire.begin();

  // Set ADXL345 in measuring mode
  Wire.beginTransmission(ADXL345); // Start communicating with the device 
  Wire.write(0x2D); // Access/ talk to POWER_CTL Register - 0x2D
  // Enable measurement
  Wire.write(8); // (8dec -> 0000 1000 binary) Bit D3 High for measuring enable 
  Wire.endTransmission();
  delay(10);
}

// void loop() {
//   float all = read_abs_acc();
//   Serial.print(" all= ");
//   Serial.print(all);
//   Serial.print(" ");
//   Serial.print(all > moving_threshold);
//   Serial.println();
//   // int print = read_xyz();
//   // Serial.println(print);
//   delay(100);
// }

float read_abs_acc(){ // read accellometer value
  int16_t x, y, z;
  float X_out, Y_out, Z_out;  // Outputs
  // === Read acceleromter data === //
  Wire.beginTransmission(ADXL345);
  Wire.write(0x32); // Start with register 0x32 (ACCEL_XOUT_H)
  Wire.endTransmission(false);
  Wire.requestFrom(ADXL345, 6, true); // Read 6 registers total, each axis value is stored in 2 registers
  x = Wire.read()| (Wire.read() << 8); // X-axis value
  X_out = ((float)x)/256; //For a range of +-2g, we need to divide the raw values by 256, according to the datasheet
  y = Wire.read()| (Wire.read() << 8); // Y-axis value
  Y_out = ((float)y)/256;
  z = Wire.read()| (Wire.read() << 8); // Z-axis value
  Z_out = ((float)z)/256;
  return sqrt(pow(X_out,2)+pow(Y_out,2)+pow(Z_out,2));
}