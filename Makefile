test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--require should \
		--slow 2s

.PHONY: test
