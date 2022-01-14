from flask import Flask , render_template, request
from flask.helpers import send_from_directory
import time
import threading
from datetime import datetime, timezone
app = Flask(__name__, static_url_path='')

import logging
log = logging.getLogger('werkzeug')
log.disabled = True

Plans = []
CurrentPlan = {}
Status = "ready"

def ftToIntervalHMS(fut):
	fut = fut/1000
	x = time.time()
	timestamp = datetime.fromtimestamp(fut - x, timezone.utc)
	return [timestamp.hour, timestamp.minute, timestamp.second]

def timeToMs(hh, mm, ss):
	hh = hh * 60 * 60 * 1000
	mm = mm * 60 * 1000
	ss = ss * 1000
	return hh + mm + ss

def findFuture(interval):
	return interval + time.time() * 1000

################### FILE ######################

@app.route('/app/')
def getIndex():
	return send_from_directory('', 'index.html')

@app.route('/app/<path:path>')
def sendDyn(path):
	return send_from_directory('', path)

################### Schedule ######################

# update edit
@app.route('/schedule/<int:index>', methods=['PATCH'])
def updateschedule(index):
	data = request.json
	Plans[index] = { 
		"name" : data["name"],
		"hh" :  data["hh"],
		"mm" :  data["mm"],
		"ss" :  data["ss"],
	}
	return {"success" : 1} 

# fetch schedule
@app.route('/schedule', methods=['GET'])
def getSchedule():
	return {"result": Plans}

# add new schedule
@app.route('/schedule', methods=['POST'])
def postSchedule():
	data = request.json 
	Plans.append(data)
	return {"success": 1 }

# delete schedule ( when press '-' button)
@app.route("/schedule/<int:index>", methods=['DELETE'])
def delete_schedule(index):
	if (index > len(Plans)):
		return {"success": 0}
	del Plans[index]
	return {"success": 1}

################## Current-Plan ###################

# front-end get current plan
@app.route("/currentplan", methods=['GET'])
def getcurrentplan():
	return {"result": CurrentPlan}

# back-end get current plan from front-end
@app.route("/currentplan", methods=['POST'])
def postcurrentplan():
	global CurrentPlan;
	data = request.json
	CurrentPlan={
		"name" : data["name"],
		"future": data["future"]
	}
	return {"success" : 1}

@app.route("/currentplan", methods=['DELETE'])
def delete_currentplan():
	CurrentPlan.clear()
	return {"success": 1}

##################### Continue ####################

@app.route("/continue", methods=["POST"])
def postcontinuetime():
	data = request.json
	global Status
	Status = "ready"
	CurrentPlan["future"] = data["future"]

	# to hardward
	writeState(0)
	return {"success" : 1}

####################### Pause #######################

# front-end post interval-time for pause
@app.route("/pause",methods=["POST"])
def postpausetime():
	data = request.json
	global Status
	Status = "pause"
	CurrentPlan["interval"] = data["interval"]

	# to hardware -> pause
	writeState(2)
	return {"success" : 1}

####################### Skip #######################

# front-end post interval-time for pause
@app.route("/skip",methods=["GET"])
def getskip():
	if (Plans == []):
		CurrentPlan = {}
		for i in range(10):
			time.sleep(0.05)
			try:
				writeTime(0, 0, 0)
				writeState(-1)
				break
			except Exception as e:
				print("!ERROR1")
	else:
		plan = Plans.pop(0)
		future = findFuture(timeToMs(plan["hh"],plan["mm"],plan["ss"]))
		CurrentPlan = {
			"name" : plan["name"],
			"future" : future
		}
		for i in range(10):
			time.sleep(0.05)
			try:
				writeTime(plan["hh"],plan["mm"],plan["ss"])
				break
			except Exception as e:
				print("!ERROR1")

	return {"success" : 1}

######################## GetStatus #######################

# get status ( ready , alert , pause)
@app.route("/status" , methods=['GET'])
def getstatus():
	global Status
	all = len(Plans)

	if (CurrentPlan == {}):
		Status = "ready"
	else:
		all += 1
		if CurrentPlan["future"]/1000 <= time.time():
			# timeout
			Status = "alert"

	return {"status": Status, "all": all }

# ==========================================================
# ==========================================================

# = WRITE =
# request : index : value

# Write time
# 0 : 0 : hh
# 0	: 1 : mm
# 0 : 2 : ss

# Write State
# 1 : free(-1), counting(0), alert(1), pause(2) : -

# Sync time when counting
# 2 : 

# = READ =
# Read State
# 3 : - : free(-1), counting(0), alert(1), pause(2)

# Read time
# 4 : 0 : hh
# 4 : 1 : mm
# 4 : 2 : ss

# ==========================================================
# ==========================================================

import usb
from practicum import find_mcu_boards, McuBoard
devices = find_mcu_boards()
mcu = McuBoard(devices[0])

def write(request, index, value=0):
	mcu.usb_write(request=request, index=index, value=value)
	# pass

def read(request, index=0):
	return mcu.usb_read(request=request, index=index)[0]
	# return 1

def writeTime(hh, mm, ss):
	print(hh, mm, ss)
	write(0, 2, ss)
	write(0, 1, mm)
	write(0, 0, hh)

def writeState(state):
	write(1, state)

def readState():
	state = read(3)
	return -1 if state == 255 else state

def readTime():
	hh = read(4, 0)
	mm = read(4, 1)
	ss = read(4, 2)
	return [hh, mm, ss]

_run = True
def syncHardware():
	global Status, CurrentPlan, Plans, _run
	while (_run):
		time.sleep(1)
		try:
			_state = readState()
			print("HARDWARE, STATE: ", _state)
		
			if (CurrentPlan == {} and Plans == []):
				if (_state == 0):
					# add new current by hardware
					hh, mm, ss = readTime()
					future = findFuture(timeToMs(hh,mm,ss))
					CurrentPlan = {
						"name" : "TIMER FROM HARDWARE",
						"future" : future
					}

			if (CurrentPlan != {} and CurrentPlan["future"]/1000 <= time.time()):
				Status = "alert"

			if (_state == -1):
				# skip ? state 0  -> -1
				# init   state -1 -> -1
				# hardware : alert -> free
				if (Status == "alert"):
					# clear alert by hardware
					Status  = "ready"
					CurrentPlan = {}
					if (Plans != []):
						print("IF")
						plan = Plans.pop(0)
						print(plan)
						future = findFuture(timeToMs(plan["hh"],plan["mm"],plan["ss"]))
						print(future)
						CurrentPlan = {
							"name" : plan["name"],
							"future" : future
						}
						print(CurrentPlan)
						writeTime(plan["hh"],plan["mm"],plan["ss"])
				elif (Status == "ready" and CurrentPlan != {}):
					# add current to hardware
					hh, mm, ss = ftToIntervalHMS(CurrentPlan["future"] )
					writeTime(hh, mm, ss)


			if (_state == 2 and Status != "pause"):
				Status = "pause"
				hh , mm , ss = readTime()
				interval = timeToMs(hh,mm,ss)
				CurrentPlan["interval"] = interval
			
			if (_state == 0 and Status == "pause"):
				Status = "ready"
				hh, mm ,ss = readTime()
				future = CurrentPlan["interval"] + time.time()*1000
				CurrentPlan["future"] = future
		except Exception as e:
			print(e)
			continue

thr = threading.Thread(target=syncHardware)
thr.start()


if __name__ == "__main__":
	app.run(host='0.0.0.0', port='47757', debug=False)