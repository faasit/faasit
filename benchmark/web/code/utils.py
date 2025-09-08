import random
import time

def random_string(length) -> str:
	characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	return ''.join(random.choice(characters) for _ in range(length))

def CreatePost(max_posts, max_users, post_length) -> dict:
	print(max_posts)
	initial_post = {}
	user_post = {}
	for i in range(max_posts):
		timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
		post_id = f"{timestamp}-{i}"

		content = random_string(post_length)
		initial_post[post_id] = {"timestamp": timestamp, 'content': content}

		username = f"username_{random.randint(1, max_users-1)}"
		if username not in user_post.keys():
			user_post[username] = []
		user_post[username].append(post_id)
	
	return initial_post, user_post

def CreateUser(max_users, max_followers) -> dict:
	user_info = {}
	for i in range(max_users):
		username = f"username_{i}"
		password = f"pwd_{i}"
		followers = random.randint(1, max_followers)
		followers = [f"username_{random.randint(1, max_users)}" for _ in range(followers)]
		user_info[username] = {'password': password, 'followers': followers, 'posts': []}
	
	return user_info