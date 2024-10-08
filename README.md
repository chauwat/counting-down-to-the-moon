Counting down to the moon
===================================

#### รายละเอียด
จุดประสงค์ของโครงงานนี้จัดขึ้นเพื่อ ที่จะให้ผู้ที่ต้องการจำกัดเวลาในการทำสิ่งต่างๆ โดยที่เราสามารถกำหนดเวลาได้จากทั้งตัวหน้าเว็บ และตัวบอร์ดเอง ส่วนเวลาเรากำหนดในการนับถอยหลังนั้นจะไปแสดงบนหน้าเว็บ เมื่อหมดเวลาเสียง buzzer ก็จะดัง เราก็ต้องลุกไปกดปุ่มปิดเสียงบนตัวบอร์ดซึ่งวางไว้ในอีกตำแหน่งเพื่อให้บังคับให้ผู้ใช้ได้เดินไปกดปิด (หมดเวลาในการทำกิจกรรมในช่วงนั้นๆ) โดยที่สามารถใช้เครื่องที่ทางกลุ่มเราประดิษฐ์ขึ้นเพื่อที่จะ ตั้งเวลาที่จะนับถอยหลังในการทำสิ่งต่างๆได้อย่างลงตัว

#### เทคนิคที่ใช้

- Backend
จำลองการใช้งาน Database ด้วย local variable
ใช้ Flask เพื่อเป็นระบบสำหรับเชื่อมต่อระหว่างฮาร์ดแวร์และเว็บไซต์
มีการ sync เวลาที่แสดงบนเว็บและฮาร์ดแวร์เป็นช่วงเวลา เพื่อตรวจสอบการทำงานผิดพลาด

- Frontend
การนับเวลาถอยหลังแบบ Realtime
ใช้ css ในการตกแต่งขั้นสูงบนหน้าต่างเว็บไซต์
มีการใช้ในการ sync ข้อมูลโดยที่จะนำเวลาปัจจุบันไปบวกกับเวลาอนาคตเพื่อที่จะได้เวลาที่เวลาปัจจุบันต้องบอกไปเรื่อยๆทีละ 1 วินาทีเพื่อที่จะทันกับเวลาที่บวกไป โดยใช้คำสั่ง setInterval() ในการบวกเวลาปัจจุบันไปเรื่อยๆทีละ 1 วินาที

- Hardware
การใช้งานปุ่มแบบ multifunction โดยใช้งานปุ่มทั้งสองเป็น button ที่มีฟังก์ชั่นหลากหลาย
การนับเวลาแบบ Quick time forward ซึ่งจะนับเวลาได้อย่างรวดเร็วตั้งแต่เริ่มทำการจับเวลา
การรับอินพุด มีการตรวจสอบช่วงเวลาในการกดปุ่มระดับมิลลิวินาที เพื่อให้สามารถปรับเวลาจากบนบอร์ดได้อย่างสะดวก และป้องกันปัญหาการทำงานต่อเนื่องจากการกดแบบที่ไม่ต้องการ

#### อุปกรณ์ที่ใช้
- Raspberry pi
- SD card
- Micro-USB
- Button 2 ปุ่ม
- OLED display
- Buzzer
- MCU board
- LED
- Resistor

#### Library ที่ใช้
**Frontend & backend**
- Flask ใช้ในการเปิดเซิร์ฟเวอร์
- Python 3.9.4

**Hardware**
- usbdrv
- Adafruit_SSD1306 ( for oled )

**Picture**
![MCU Alarm Device](./assets/mcu_alarm_device.jpg)

![Web Interface](./assets/web_interface.png)

By Chauwat , Mollarath , Tharinrath and Burapa
--------------------------------------

_Since March 26 2021_
