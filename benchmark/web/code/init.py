from faasit_runtime import function, FaasitRuntime
import json
import time
from utils import CreatePost, CreateUser
import logging

env = {
	"LambdaId": "retwis",
	"InstanceId": "t"+str(110)
}

@function
def InitUserAndPost(frt : FaasitRuntime):
	start_time = time.time()
	params = frt.input()
	max_users = params['max_users']  # 1000000
	max_followers = params['max_followers']
	max_posts = params['max_posts']
	post_length = params['post_length']
	start_compute_time = time.time()
	user_info = CreateUser(max_users, max_followers)
	initial_post, user_post = CreatePost(max_posts, max_users, post_length)
	for username in user_post.keys():
		user_info[username]['posts'].extend(user_post[username])
	com_data = {'user_info': user_info, 'post_info': initial_post}

	end_compute_time = time.time()
	start_output_time = time.time()
	# store = frt.storage
	# store.put(f'{oa}-2', com_data, dest_stages=["stage2"])
	# store.put(f'{oa}-3', com_data, dest_stages=["stage3"])
	# store.put(f'{oa}-4', com_data, dest_stages=["stage4"])
	# store.put(f'{oa}-5', com_data, dest_stages=["stage5"])
	# md.output(['stage2'], f'{oa}-2', com_data)
	# md.output(['stage3'], f'{oa}-3', com_data)
	# md.output(['stage4'], f'{oa}-4', com_data)
	# md.output(['stage5'], f'{oa}-5', com_data)

	end_output_time = time.time()
	end_time = time.time()

	return_val = {
		'process_time': end_time - start_time,
		'input_time': 0,
		'compute_time': end_compute_time - start_compute_time,
		'output_time': end_output_time - start_output_time,
	}
	
	# frt.log(env, "initUserAndPost", return_val)
	
	return {
		'info': com_data
	}

initUserAndPost = InitUserAndPost.export()
# if __name__ == '__main__':
#     schedule = {'stage0': ('10.10.1.1', 30040), 'stage1': ('10.10.1.1', 30041), 
#                         'stage2': ('10.10.1.1', 30042), 'stage3': ('10.10.1.1', 30043),
#                         'stage4': ('10.10.1.1', 30044), 'stage5': ('10.10.1.1', 30045),
#                         'stage6': ('10.10.1.1', 30046)}
#     request_id = "000000"
#     use_redis_when_remote = True
#     params = {
#         'output': f'{request_id}-Retwis/stage0/movie_info', 
#         'use_redis_when_remote': use_redis_when_remote,
#         'max_users': 10000,
#         'max_followers': 500,
#         'max_posts': 5000,
#         'post_length': 20,
#         'schedule': schedule
#     }
#     InitUserAndPost(params)
    # PYTHONPATH=${PYTHONPATH}:/CommunicatingFramework:/retwis python3 retwis/init.py