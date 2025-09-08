from faasit_runtime import function, FaasitRuntime
import info as Info
import json, time

env = {
	"LambdaId": "retwis",
	"InstanceId": "t"+str(110)
}

@function
def Timeline(frt : FaasitRuntime):
	start_time = time.time()
	params = frt.input()
	info = params['input_info']
	review_request = params['input_request']
	# ia_update = params['update']
	# ia_com_info = params['newpost']
	# oa = params['output']
	failed_msg, success_msg, update_cnt = 0, 0, 0
	results = {}
	
	response = []
	start_input_time = time.time()
	
	# store = frt.storage
	# info = store.get(ia_info, src_stage='stage0')
	# review_request = store.get(ia_request, src_stage='stage1')
	# info =  md.get_object('stage0', ia_info)
	# review_request = md.get_object('stage1', ia_request)
	end_input_time = time.time()

	start_compute_time = time.time()	
	user_info : dict = info['user_info']
	post_info : dict = info['post_info']
	update = params['update']
	origin_update = update
	# update = store.get(ia_update, src_stage='stage4')
	# update = md.get_object('stage4', ia_update)
 
	for idx, single_request in enumerate(review_request):
		# [req_id, request_type.value, username]
		if idx % 5000 == 0 and idx > 0:
			update_state = origin_update
			# update_state = md.get_object('stage4', ia_update)
			if update != update_state:
				update_cnt += 1
				update = update_state
				new_com_info = params['newpost']
				# new_com_info = store.get(ia_com_info, src_stage='stage4')
				# new_com_info = md.get_object('stage4', ia_com_info)
				new_user_info, new_post_info = new_com_info['new_user_info'], new_com_info['new_post_info']
				for username in new_user_info.keys():
					if username not in user_info.keys():
						continue
					user_info[username]['posts'].extend(new_user_info[username])
				post_info.update(new_post_info)
		req_id, request_type, username = single_request
		if request_type != Info.RequestType.Timeline.value:
			response.append([req_id, 'Invalid request type in search.'])
			failed_msg += 1
			continue
		
		user = user_info.get(username)
		if user is None:
			continue
		user_posts = user['posts']
		user_posts_cnt = len(user_posts)

		response_msg = f"Found {user_posts_cnt} posts from {username}"
		
		response.append([req_id, response_msg])
		success_msg += 1

	end_compute_time = time.time()
	start_output_time = time.time()
	results['output'] = response
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
		'update_cnt': update_cnt,
	}
	# frt.log(env, "timeline", return_val)
	
	return results

timeline = Timeline.export()