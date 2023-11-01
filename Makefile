


help:
	echo help


build-faasit-runtime:
	cd packages/faasit-runtime/javascript && pnpm build

publish-faasit-runtime:
	# cd packages/faasit-runtime/javascript && pnpm publish --dry-run
	cd packages/faasit-runtime/javascript && pnpm publish --access public