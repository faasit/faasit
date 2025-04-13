import oss2
import os
auth = oss2.Auth(os.environ['FAASIT_SECRET_ALIYUN_ACCESS_KEY_ID'], os.environ['FAASIT_SECRET_ALIYUN_ACCESS_KEY_SECRET'])
endpoint = f'https://oss-{os.environ["FAASIT_SECRET_ALIYUN_REGION"]}.aliyuncs.com'
bucket = oss2.Bucket(auth, endpoint, os.environ['ALIBABA_CLOUD_OSS_BUCKET_NAME'])
for file in os.listdir('.'):
    if file.endswith('.npy'):
        print(f'Uploading {file}...')

        with open(file, 'rb') as f:
            bucket.put_object(file, f)
        # bucket.put_object(file, file)
        print(f'Uploaded {file} successfully.')