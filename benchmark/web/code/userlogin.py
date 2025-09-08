from faasit_runtime import function, FaasitRuntime
import info as Info
import json, time

env = {
	"LambdaId": "retwis",
	"InstanceId": "t"+str(110)
}

@function
def UserLogin(frt : FaasitRuntime):
	start_time = time.time()
	params = frt.input()
	info = params['input_info']
	login_request = params['input_request']
	failed_msg, success_msg = 0, 0
	
	response = []
	start_input_time = time.time()
	
	# store = frt.storage
	# info  = store.get(ia_info, src_stage='stage0')
	# login_request = store.get(ia_request, src_stage='stage1')
	# info =  md.get_object('stage0', ia_info)
	# login_request = md.get_object('stage1', ia_request)
		
	end_input_time = time.time()
	start_compute_time = time.time()	
	user_info : dict = info['user_info']
	
	for single_request in login_request:
		# [req_id, request_type.value, username, password]
		req_id, request_type, username, password = single_request
		if request_type != Info.RequestType.UserLogin.value:
			response.append([req_id, 'Invalid request type in user login.'])
			failed_msg += 1
			continue
		if int(username.split('_')[-1]) != password or user_info.get(username) is None:
			response.append([req_id, 'Login failed. Username mismatches with password.'])
		else:
			success_msg += 1
			response.append([req_id, 'Login success.']) 
	
	end_compute_time = time.time()
	start_output_time = time.time()
	# store.put(oa, response, dest_stages=['stage6'])
	# md.output(['stage6'], oa, response)
	
	end_output_time = time.time()
	end_time = time.time()
  
	return_val = {
		'process_time': end_time - start_time,
		'input_time': end_input_time - start_input_time,
		'compute_time': end_compute_time - start_compute_time,
		'output_time': end_output_time - start_output_time,
		'failed_request': failed_msg,
		'success_request': success_msg,
	}

	# frt.log(env, "userLogin", return_val)
	
	return {
		"output": response
	}

userLogin = UserLogin.export()
