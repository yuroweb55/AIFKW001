import face_recognition
import cv2
import os
import numpy as np
import requests
import pickle
import base64
import threading
import time
from concurrent.futures import ThreadPoolExecutor
import pymysql
from flask import Flask, request, jsonify
import signal
import sys
import mediapipe as mp
import faiss
import uuid
# เตรียม mediapipe face detector
mp_face_detection = mp.solutions.face_detection
mp_drawing = mp.solutions.drawing_utils

face_detector = mp_face_detection.FaceDetection(model_selection=0, min_detection_confidence=0.5)

def get_face_locations_with_mediapipe(rgb_frame):
    results = face_detector.process(rgb_frame)
    locations = []

    if results.detections:
        for detection in results.detections:
            bbox = detection.location_data.relative_bounding_box
            h, w, _ = rgb_frame.shape
            xmin = int(bbox.xmin * w)
            ymin = int(bbox.ymin * h)
            width = int(bbox.width * w)
            height = int(bbox.height * h)
            top = ymin
            right = xmin + width
            bottom = ymin + height
            left = xmin
            locations.append((top, right, bottom, left))

    return locations

# ---------- CONFIG ----------
UPLOAD_FOLDER = './uploads'
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}
padding = 20
urlnode1 = 'http://localhost:5500/py-ai-id-user'
urlimgtonode = 'http://localhost:5500/frame'
urlimgtonode_cropped = 'http://localhost:5500/frame-cropped'
FAISS_DISTANCE_THRESHOLD = 0.20  # แนะนำให้ใช้ค่าที่เข้มงวดขึ้นจาก 0.6 → 0.45
person_counter = {}
executor = ThreadPoolExecutor(max_workers=4)

# ---------- MYSQL ----------
conn = pymysql.connect(
    host='localhost',
    user='root',
    password='',
    database='aifkw',
    charset='utf8mb4',
    cursorclass=pymysql.cursors.DictCursor
)
cursor = conn.cursor()

# ---------- FLASK ----------
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ---------- HELPER ----------
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def reset_counter(name):
    time.sleep(5)
    if person_counter.get(name, 0) < 5:
        person_counter[name] = 0

def handle_recognized_face(name, left, top, right, bottom, frame):
    if name in person_counter:
        person_counter[name] += 1
    else:
        person_counter[name] = 1
        threading.Thread(target=reset_counter, args=(name,)).start()

    if person_counter[name] >= 5:
        center_x = (left + right) // 2
        center_y = (top + bottom) // 2
        desired_height = 400
        desired_width = int(desired_height * 3 / 4)
        new_top = max(center_y - desired_height // 2, 0)
        new_bottom = min(center_y + desired_height // 2, frame.shape[0])
        new_left = max(center_x - desired_width // 2, 0)
        new_right = min(center_x + desired_width // 2, frame.shape[1])
        cropped_face = frame[new_top:new_bottom, new_left:new_right]

        _, buffera = cv2.imencode('.jpg', cropped_face)
        jpg_as_texta = base64.b64encode(buffera).decode('utf-8')

        try:
            requests.post(urlimgtonode_cropped, json={'image': jpg_as_texta, 'studentid': name}, timeout=2)
        except Exception as e:
            print("Error sending cropped image:", e)

        person_counter[name] = 0

# ---------- LOAD KNOWN FACES + BUILD FAISS INDEX ----------
known_faces = []
known_encodings = []

cursor.execute("SELECT idsd, data FROM faces WHERE py=1")
rows = cursor.fetchall()
if rows:
    print("[LOG] Loaded from MySQL")
    for row in rows:
        encoding_array = pickle.loads(row['data'])
        known_faces.append({'name': row['idsd'], 'encoding': encoding_array})
        known_encodings.append(encoding_array)

if known_encodings:
    known_encodings_np = np.array(known_encodings).astype('float32')
    faiss_index = faiss.IndexFlatL2(128)  # 128-dimension face encodings
    faiss_index.add(known_encodings_np)
else:
    faiss_index = None

# ---------- API ----------
@app.route('/addsave-sd', methods=['POST'])
def addsave_sd():
    global faiss_index, known_faces, known_encodings_np

    data = request.get_json()
    room = data.get('room')
    name = data.get('name')
    idsd = data.get('idsd')
    image_base64 = data.get('image')
    tyen = data.get('tyen')  # '1' = insert, '0' = update

    if not room or not name or not idsd or not image_base64 or not tyen:
        return jsonify({'status': 'error', 'message': 1}), 201

    try:
        image_data = base64.b64decode(image_base64.split(',')[-1])
    except Exception:
        return jsonify({'status': 'error', 'message': 2}), 201

    filename = f"{uuid.uuid4().hex}.jpg"
    image_path = os.path.join(UPLOAD_FOLDER, filename)

    try:
        with open(image_path, 'wb') as f:
            f.write(image_data)
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Write error: {str(e)}'}), 500

    try:
        image = face_recognition.load_image_file(image_path)
        encodings = face_recognition.face_encodings(image)

        if len(encodings) != 1:
            os.remove(image_path)
            return jsonify({'status': 'error', 'message': 3 if len(encodings) == 0 else 6}), 201

        new_encoding = encodings[0]

        if tyen == '1':  # INSERT
            cursor.execute("SELECT COUNT(*) as count FROM faces WHERE idsd = %s", (idsd,))
            result = cursor.fetchone()
            if result['count'] > 0:
                os.remove(image_path)
                return jsonify({'status': 'error', 'message': 4}), 201

            # ตรวจสอบซ้ำใน insert เท่านั้น
            if known_faces:
                known_encodings_check = np.array([f['encoding'] for f in known_faces])
                distances = np.linalg.norm(known_encodings_check - new_encoding, axis=1)
                if np.any(distances < 0.35):
                    os.remove(image_path)
                    return jsonify({'status': 'error', 'message': 5}), 201

            encoding_binary = pickle.dumps(new_encoding)
            cursor.execute("INSERT INTO faces (idsd, room, name, data, py) VALUES (%s, %s, %s, %s, %s)",
                           (idsd, room, name, encoding_binary, 1))
            conn.commit()

            known_faces.append({'name': idsd, 'encoding': new_encoding})
            if faiss_index is None:
                faiss_index = faiss.IndexFlatL2(128)
                known_encodings_np = np.array([new_encoding], dtype='float32')
                faiss_index.add(known_encodings_np)
            else:
                known_encodings_np = np.vstack([known_encodings_np, new_encoding.astype('float32')])
                faiss_index.add(np.array([new_encoding], dtype='float32'))

        elif tyen == '0':  # UPDATE: อัพเดตข้อมูลโดยไม่ลบ
            encoding_binary = pickle.dumps(new_encoding)
            cursor.execute("""
                UPDATE faces SET room = %s, name = %s, data = %s, py = %s WHERE idsd = %s
            """, (room, name, encoding_binary, 1, idsd))
            conn.commit()

            # อัพเดต known_faces และ faiss_index
            idx_to_update = next((i for i, f in enumerate(known_faces) if f['name'] == idsd), None)
            if idx_to_update is not None:
                known_faces[idx_to_update]['encoding'] = new_encoding
                known_encodings_np[idx_to_update] = new_encoding.astype('float32')
                faiss_index.reset()
                faiss_index.add(known_encodings_np)
            else:
                known_faces.append({'name': idsd, 'encoding': new_encoding})
                if faiss_index is None:
                    faiss_index = faiss.IndexFlatL2(128)
                    known_encodings_np = np.array([new_encoding], dtype='float32')
                    faiss_index.add(known_encodings_np)
                else:
                    known_encodings_np = np.vstack([known_encodings_np, new_encoding.astype('float32')])
                    faiss_index.add(np.array([new_encoding], dtype='float32'))

        os.remove(image_path)
        return jsonify({'status': 'success', 'message': 'ok'})

    except Exception as e:
        if os.path.exists(image_path):
            os.remove(image_path)
        return jsonify({'status': 'error', 'message': str(e)}), 500

    

@app.route('/delete-sd', methods=['POST'])
def delete_sd():
    global faiss_index, known_faces, known_encodings_np

    idsd = request.get_json().get('idsd')
    if not idsd:
        return jsonify({'status': 'error', 'message': 1}), 201

    try:
        # ลบจากฐานข้อมูล
        cursor.execute("DELETE FROM faces WHERE idsd = %s", (idsd,))
        cursor.execute("DELETE FROM imgsd WHERE idsd = %s", (idsd,))
        conn.commit()

        # ลบจาก memory
        known_faces = [f for f in known_faces if f['name'] != idsd]
        known_encodings_np = np.array([f['encoding'] for f in known_faces], dtype='float32')

        if faiss_index is not None:
            faiss_index.reset()
            if len(known_encodings_np) > 0:
                faiss_index.add(known_encodings_np)
            else:
                faiss_index = None

        return jsonify({'status': 'success', 'message': 'deleted'}), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


    

@app.route('/')
def index():
    return 'Flask Server Running on Port 5501'

# ---------- CAMERA + RECOGNITION ----------
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

def encode_face(rgb_frame, face_location):
    try:
        return face_recognition.face_encodings(rgb_frame, [face_location])[0]
    except:
        return None

# [เหมือนเดิม] — import และ setup...



# ส่วนของ run_camera_loop (เฉพาะตรงที่ปรับปรุง)
def run_camera_loop():
    global cap, faiss_index
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_locations = get_face_locations_with_mediapipe(rgb_frame)

        face_encodings = list(executor.map(lambda loc: encode_face(rgb_frame, loc), face_locations))
        datagg = False
        for loc, face_encoding in zip(face_locations, face_encodings):
            if face_encoding is None or faiss_index is None:
                continue

            datagg = True
            name = "Unknown"
            query = np.array([face_encoding], dtype='float32')
            D, I = faiss_index.search(query, k=1)

            if D[0][0] < FAISS_DISTANCE_THRESHOLD:
                matched_index = I[0][0]
                name = known_faces[matched_index]['name']
                top, right, bottom, left = loc
                handle_recognized_face(name, left, top, right, bottom, frame)

            top, right, bottom, left = loc
            cv2.rectangle(
                frame,
                (left - padding, top - padding),
                (right + padding, bottom + padding),
                (0, 255, 0),
                2
            )
            cv2.putText(
                frame,
                name,
                (left - 10, top - 25),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (255, 255, 0),
                2
            )

        _, buffer = cv2.imencode('.jpg', frame)
        jpg_as_text = base64.b64encode(buffer).decode('utf-8')
        try:
            requests.post(urlimgtonode, json={'image': jpg_as_text, 'datagg': datagg}, timeout=1.5)
        except:
            pass

    cap.release()
    cv2.destroyAllWindows()


# ---------- CLEAN EXIT ----------
def signal_handler(sig, frame):
    print("Exiting gracefully...")
    executor.shutdown(wait=True)
    cursor.close()
    conn.close()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

# ---------- RUN ----------
if __name__ == '__main__':
    threading.Thread(target=run_camera_loop, daemon=True).start()
    app.run(host='0.0.0.0', port=5501)
