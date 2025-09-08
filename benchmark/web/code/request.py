from faasit_runtime import function, FaasitRuntime
import json
import random
import time
import info as Info
from utils import random_string

env = {
	"LambdaId": "retwis",
	"InstanceId": "t"+str(110)
}

@function
def Request(frt: FaasitRuntime):
	start_time = time.time()
	params = frt.input()
	max_users = params['max_users']  # 1000000
	post_length = params['post_length']
	# oa = params['output']
	login_message_cnt = 0
	profile_message_cnt = 0
	post_message_cnt = 0
	timeline_message_cnt = 0
	
	start_compute_time = time.time()
	password_threshold = 1000
	
	login_request = []
	profile_request = []
	post_request = []
	timeline_request = []
	
	for req_id in range(100):
		request_type = random.randint(1, 7)
		request_type = 4 if request_type > 4 else request_type
		request_type = Info.RequestType(request_type)
		
		if request_type == Info.RequestType.UserLogin:
			# [req_id, request_type.value, username, password]
			username = random.randint(1, max_users-1)
			password = username if username > password_threshold else 0
			username = f'username_{username}'
			login_request.append([req_id, request_type.value, username, password])
			login_message_cnt += 1

		elif request_type == Info.RequestType.Profile:
			# [req_id, request_type.value, username]
			username = f'username_{random.randint(1, max_users + max_users/10)}'
			profile_request.append([req_id, request_type.value,username])
			profile_message_cnt += 1

		elif request_type == Info.RequestType.Post:
			# [req_id, request_type.value, username, content]
			username = f'username_{random.randint(1, max_users-1)}'
			content = random_string(post_length)
			post_request.append([req_id, request_type.value, username, content])
			post_message_cnt += 1

		elif request_type == Info.RequestType.Timeline:
			# [req_id, request_type.value, username]
			username = f'username_{random.randint(1, max_users-1)}'
			timeline_request.append([req_id, request_type.value, username])
			timeline_message_cnt += 1

	end_compute_time = time.time()
	start_output_time = time.time()
	# store = frt.storage
	# store.put(f'{oa}-2', login_request, dest_stages=["stage2"])
	# store.put(f'{oa}-3', profile_request, dest_stages=["stage3"])
	# store.put(f'{oa}-4', post_request, dest_stages=["stage4"])
	# store.put(f'{oa}-5', timeline_request, dest_stages=["stage5"])
	# md.output(['stage2'], f'{oa}-2', login_request)
	# md.output(['stage3'], f'{oa}-3', profile_request)
	# md.output(['stage4'], f'{oa}-4', post_request)
	# md.output(['stage5'], f'{oa}-5', timeline_request)

	end_output_time = time.time()
	end_time = time.time()
	return_val = {
		'process_time': end_time - start_time,
		'input_time': 0,
		'compute_time': end_compute_time - start_compute_time,
		'output_time': end_output_time - start_output_time,
		'login_message': login_message_cnt,
		'profile_message': profile_message_cnt,
		'post_message': post_message_cnt,
		'timeline_message': timeline_message_cnt,
	}

	# frt.log(env, "request", return_val)
	
	return {
		"login_request": login_request,
		"profile_request": profile_request,
		"post_request": post_request,
		"timeline_request": timeline_request
	}

request = Request.export()