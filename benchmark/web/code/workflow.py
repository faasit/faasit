from faasit_runtime import workflow, Workflow


@workflow
def retwisworkflow(wf: Workflow):
    s0 = wf.call('stage0', {
        "max_users": 500,
        "max_followers": 10,
        "max_posts": 50,
        "post_length": 20
    })
    
    # output: Retwis/stage1/request
    # max_users: 10000
    # post_length: 20
    s1 = wf.call("stage1", {
        "max_users": 1000,
        "post_length": 4,
    })

    # input_info: Retwis/stage0/movie_info-2
    # input_request: Retwis/stage1/request-2
    # output: Retwis/stage2/userlogin
    s2 = wf.call("stage2", {
        "input_info": s0['info'],
        "input_request": s1['login_request'],
    })

    # input_info: Retwis/stage0/movie_info-3
    # input_request: Retwis/stage1/request-3
    # output: Retwis/stage3/profile
    s3 = wf.call('stage3', {
        "input_info": s0["info"],
        "input_request": s1["profile_request"],
    })

    # input_info: Retwis/stage0/movie_info-4
    # input_request: Retwis/stage1/request-4
    # update: Retwis/stage4/update
    # newpost: Retwis/stage4/newpost
    # output: Retwis/stage4/post
    s4 = wf.call("stage4", {
        "input_info": s0['info'],
        "input_request": s1["post_request"],
    })

    # input_info: Retwis/stage0/movie_info-5
    # input_request: Retwis/stage1/request-5
    # update: Retwis/stage4/update
    # newpost: Retwis/stage4/newpost
    # output: Retwis/stage5/timeline
    s5 = wf.call("stage5", {
        "input_info": s0["info"],
        "input_request": s1["timeline_request"],
        "update": s4['update'],
        "newpost": s4['newpost'],
    })

    # input_login: Retwis/stage2/userlogin
    # input_profile: Retwis/stage3/profile
    # input_post: Retwis/stage4/post
    # input_timeline: Retwis/stage5/timeline
    # output: Retwis/stage6/updatereview
    s6 = wf.call("stage6", {
        "input_login": s2['output'],
        "input_profile": s3['output'],
        "input_post": s4['output'],
        "input_timeline": s5['output'],
    })

    return s6

retwisworkflow = retwisworkflow.export()

