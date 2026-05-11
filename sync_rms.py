import requests
import time

API_BASE = 'https://rm-backend-production-a701.up.railway.app/api'
new_rms = ["Manpreet", "Sarika", "Riya", "Divya", "Tina", "Harpreet", "Ujala"]

print("Checking if server is online...")
# Wait for server to be online
while True:
    response = requests.get(f'{API_BASE}/employees')
    if response.status_code == 200:
        print("Server is online!")
        current_employees = response.json().get('data', [])
        for emp in current_employees:
            emp_id = emp['id']
            emp_name = emp['employee_name']
            print(f"Deleting {emp_name} ({emp_id})")
            requests.delete(f'{API_BASE}/employees/{emp_id}')
        break
    else:
        print("Waiting for server... (502 usually means still deploying)")
        time.sleep(5)

# Add new ones
for name in new_rms:
    print(f"Adding {name}")
    res = requests.post(f'{API_BASE}/employees', json={'employee_name': name, 'password': '1234'})
    if res.status_code != 200:
        print(f"Failed to add {name}: {res.text}")

print("Done sync!")
