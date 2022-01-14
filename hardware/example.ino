#include <usbconfig.h>
#include <usbdrv.h>

#include <avr/io.h>
#include <avr/wdt.h>
#include <avr/interrupt.h>  /* for sei() */
#include <avr/eeprom.h>
#include <avr/pgmspace.h>   /* required by usbdrv.h */

#include <SPI.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128 // OLED display width, in pixels
#define SCREEN_HEIGHT 32 // OLED display height, in pixels
#define OLED_RESET     4 // Reset pin # (or -1 if sharing Arduino reset pin)
#define SCREEN_ADDRESS 0x3C ///< See datasheet for Address; 0x3D for 128x64, 0x3C for 128x32
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ======== CONFIG : PIN ========

#define BTNL A0
#define BTNR 11
#define LEDR 8
#define LEDY 9
#define LEDG 10
#define BUZZ A2

// ==============================
// ===========================================

int hh = 0, mm = 0, ss = 0;
int state = -1;
usbMsgLen_t usbFunctionSetup(uint8_t data[8]) {
	usbRequest_t *rq = (void *) data;
	static uint8_t index;
	static uint8_t value;
	index = rq->wIndex.bytes[0];
	value = rq->wValue.bytes[0];
	if (rq->bRequest == 0) {
		if (index == 0) hh = value;
		else if (index == 1) mm = value;
		else if (index == 2) ss = value;
		state = 0;
		return 0;
	} else if (rq->bRequest == 1) {
		state = index;
		return 0;
	} else if (rq->bRequest == 2) {
		// sth
		return 0;
	} else if (rq->bRequest == 3) {
		usbMsgPtr = &state;
		return 1;
	} else if (rq->bRequest == 4) {
		if (index == 0) usbMsgPtr = &hh;
		else if (index == 1) usbMsgPtr = &mm;
		else if (index == 2) usbMsgPtr = &ss;
		return 1;
	}
	return 0;
}

// ===========================================

void setup() {
  if(!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("SSD1306 allocation failed"));
    for(;;); // Don't proceed, loop forever
  }
  display.display();
	usbInit();
	usbDeviceDisconnect();
	delay(500);
	usbDeviceConnect();
	sei();
	display.clearDisplay();

	pinMode(BTNL, INPUT_PULLUP);
	pinMode(BTNR, INPUT_PULLUP);

	pinMode(LEDR, OUTPUT);
	pinMode(LEDY, OUTPUT);
	pinMode(LEDG, OUTPUT);

	pinMode(BUZZ, OUTPUT);
}

String txt;
int _btnl = 0, _btnr = 0;
unsigned long _btnl_timer = millis(), _btnr_timer = millis();
void loop() {
	// both button
	if (digitalRead(BTNL) == 0 && digitalRead(BTNR) == 0) {
    	digitalWrite(LEDY, HIGH);
		_btnl = 0; _btnr = 0;
		state = 0;
		delay(200);
	} else {
    	digitalWrite(LEDY, LOW);
	}

	// left button
	if (digitalRead(BTNL) == 0) {
		digitalWrite(LEDR, HIGH);

		if (_btnl == 0) {
			_btnl_timer = millis();
			_btnl = 1;

			// pause / continue
			if (state == 0) state = 2;
			else if (state == 2) state = 0;
		}

   		if (state == -1 && millis() - _btnl_timer > 50) {
			// remove minute
   			if (mm > 0 || hh > 0) {
   				mm -= 1;
   				if (millis() - _btnl_timer > 4000) mm -= 9;
   			}
   			if (mm <= 0 && hh > 0) {
   				hh -= 1;
   				mm = 60;
   			}
   		}

   		// disable sound
   		if (state == 1) state = -1;
		delay(30);
	} else {
		digitalWrite(LEDR, LOW);
		_btnl = 0;
	}

	// right button
	if (digitalRead(BTNR) == 0) {
		digitalWrite(LEDG, HIGH);
		if (_btnr == 0) {
			_btnr_timer = millis();
			_btnr = 1;
		}

		if (state == -1 && millis() - _btnr_timer > 50) {
			// add minute
   			mm += 1;
   			if (millis() - _btnr_timer > 4000) mm += 9;
   			if (mm > 60) {
   				hh += 1;
   				mm = 0;
   			}
   		}

   		// disable sound
   		if (state == 1) state = -1;

		if (state == 0) {
			// skip
			hh = 0; mm = 0; ss = 0;
			state = -1;
			delay(100);
		}
		delay(30);
	} else {
		digitalWrite(LEDG, LOW);
		_btnr = 0;
	}

	txt = "HH:MM:SS";
	drawtext(36, 0, 0, 1);

	txt = add0(hh) + ":" + add0(mm) + ":" + add0(ss);
	drawtext(12, 9, 0, 2);

	// free
	if (state == -1) {
		txt = " - Min ";
		drawtext(4, 24, _btnl, 1);
		txt = "|";
		drawtext(57, 24, 0, 1);
		txt = " + Min ";
		drawtext(78, 24, _btnr, 1);
	}

	// counting
	if (state == 0) {
		txt = "o Pause  |  o Skip";
		drawtext(6, 24, 0, 1);
	}

	// pause  
	if (state == 2) {
		txt = "      PAUSE     ";
		drawtext(12, 24, 1, 1);
	}
  
	// Delay
	display.display();
	usbPoll();
	countDown();
	if (state == 1) alert();
	delay(5);

	// Pre-loop
	display.clearDisplay();
}

// =======================================

String add0(int n) {
	if (n < 10) return "0" + String(n);
	return String(n);
}


unsigned long _timer = 0;
void countDown() {
	// state : -1: init, 0: counting, 1: alert, 2:pause
	if (state) return;
	if (millis() - _timer < 1000) return;
	_timer = millis();
	if (ss == 0) {
		if (mm == 0) {
			if (hh == 0) {
				state = 1;
				return;
			}
			hh -= 1;
			mm = 60;
		}
		mm -= 1;
		ss = 60;
	}
	ss -= 1;
}

void drawtext(int x, int y, int inv, int size) {
	display.setTextSize(size);
	if (inv) {
		display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
	} else {
		display.setTextColor(SSD1306_WHITE); 
	}
	display.setCursor(x, y);
	display.println(txt);
}

int melody[] = {262, 392, 392, 440, 392, 0, 494, 523};
int noteDurations[] = {6, 12, 12, 6, 6, 6, 6, 6};
int thisNote = 0;
unsigned long _alert_timer = millis();
void alert() {
	int noteDuration = 1000 / noteDurations[thisNote];
	tone(BUZZ, melody[thisNote], noteDuration);
	if (millis() - _alert_timer < noteDuration * 1.30) return;
	thisNote++;
	if (thisNote > 7) thisNote = 0;
	noTone(BUZZ);
	_alert_timer = millis();
}
