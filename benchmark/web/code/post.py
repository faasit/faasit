from faasit_runtime import function, FaasitRuntime
import info as Info
import json, time

env = {
	"LambdaId": "retwis",
	"InstanceId": "t"+str(110)
}

@function
def Post(frt : FaasitRuntime):
	start_time = time.time()
	params = frt.input()
	info = params['input_info']
	review_request = params['input_request']
	failed_msg, success_msg = 0, 0
	
	response = []
	start_input_time = time.time()
	# store = frt.storage
	# info = store.get(ia_info, src_stage='stage0')
	# review_request = store.get(ia_request, src_stage='stage1')
	# info =  md.get_object('stage0', ia_info)
	# review_request = md.get_object('stage1', ia_request)
	end_input_time = time.time()

	start_compute_time = time.time()
	
	post_info : dict = info['post_info']
	update = False
	cur_post_id = len(post_info)
	new_post_info, new_user_info = {}, {}

	results = {}
	
	for idx, single_request in enumerate(review_request):
		# [req_id, request_type.value, username, content]
		if idx % 10000 == 0 and idx > 0:
			com_info = {'new_user_info': new_user_info, 'new_post_info': new_post_info}
			update = True if update is False else False
			results['update'] = update
			results['newpost'] = com_info
			# store.put(oa_update, update, dest_stages=['stage5'])
			# store.put(oa_com_info, com_info, dest_stages=['stage5'])
			# md.output(['stage5'], oa_update, update)
			# md.output(['stage5'], oa_com_info, com_info)
			new_post_info, new_user_info = {}, {}
		req_id, request_type, username, content = single_request
		if request_type != Info.RequestType.Post.value:
			response.append([req_id, 'Invalid request type in recommend.'])
			failed_msg += 1
			continue
		
		timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
		post_id = f"{timestamp}-{cur_post_id}"
		cur_post_id += 1

		if username not in new_user_info:
			new_user_info[username] = []
		new_user_info[username].append(post_id)
		new_post_info[post_id] = {"timestamp": timestamp, 'content': content}
		success_msg += 1

		response.append([req_id, f"New post from {username}"])

	if len(new_user_info) > 0:
		com_info = {'new_user_info': new_user_info, 'new_post_info': new_post_info}
		update = True if update is False else False
		results['update'] = update
		results['newpost'] = com_info
		# store.put(oa_update, update, dest_stages=['stage5'])
		# store.put(oa_com_info, com_info, dest_stages=['stage5'])
		# md.output(['stage5'], oa_update, update)
		# md.output(['stage5'], oa_com_info, com_info)
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
	}

	# frt.log(env, "post", return_val)
	
	return results

post = Post.export()