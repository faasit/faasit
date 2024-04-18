from setuptools import setup, find_packages

setup(
    name='faasit',
    version='0.0.1',
    author='dydy',
    description='Faasit Runtime support for Python',
    install_requires=[
        'alibabacloud_fc_open20210406==2.0.11',
        'alibabacloud_tea_openapi==0.3.8',
        'alibabacloud_tea_util==0.3.11',
        'pydantic==1.10.8',
        'python-dotenv==1.0.1',
        "oss2==2.18.4"
    ],
    packages=find_packages(),
    python_requires='>=3.6',
)