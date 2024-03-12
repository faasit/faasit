


help:
	echo help


build-faasit-runtime:
	cd packages/faasit-runtime/javascript && pnpm build

publish-faasit-runtime:
	# cd packages/faasit-runtime/javascript && pnpm publish --dry-run
	cd packages/faasit-runtime/javascript && pnpm publish --access public

gen-repo-code-file:
	rg -H -n --heading \
		-g '!*.yaml' -g '!*.json' -g '!e2e/*' -g '!*.svg' \
		'.*' > .local/faasit-repo-code.txt
