PACTICIPANT := "pactflow-example-bi-directional-provider-drift"
GITHUB_REPO := "pactflow/example-bi-directional-provider-drift"
PACT_CHANGED_WEBHOOK_UUID := "c76b601e-d66a-4eb1-88a4-6ebc50c0df8b"
PACT_CLI=docker run --rm -v ${PWD}:/app/tmp -e PACT_BROKER_BASE_URL -e PACT_BROKER_TOKEN pactfoundation/pact:latest
OAS_PATH=/app/tmp/openapi.yaml
MOUNT=/app/tmp
LOCAL_REPORT_DIR_PATH?=output/results
REPORT_PATH?=${MOUNT}/output/results/
REPORT_FILE_CONTENT_TYPE?=application/vnd.smartbear.drift.result
VERIFIER_TOOL?=drift

# Only deploy from master
ifeq ($(GIT_BRANCH),master)
	DEPLOY_TARGET=deploy
else
	DEPLOY_TARGET=no_deploy
endif

all: test

## ====================
## CI tasks
## ====================

# ci: test can_i_deploy $(DEPLOY_TARGET)

# Run the ci target from a developer machine with the environment variables
# set as if it was on Github Actions.
# Use this for quick feedback when playing around with your workflows.
fake_ci: .env
	CI=true \
	GIT_COMMIT=`git rev-parse --short HEAD`+`date +%s` \
	GIT_BRANCH=`git rev-parse --abbrev-ref HEAD` \
	PACT_BROKER_PUBLISH_VERIFICATION_RESULTS=true \
	make ci

ci_webhook: .env
	npm run test:pact

fake_ci_webhook:
	CI=true \
	GIT_COMMIT=`git rev-parse --short HEAD`+`date +%s` \
	GIT_BRANCH=`git rev-parse --abbrev-ref HEAD` \
	PACT_BROKER_PUBLISH_VERIFICATION_RESULTS=true \
	make ci_webhook

## =====================
## Build/test tasks
## =====================

test: .env
	npm run test

ci: clean
	@if make test; then \
		EXIT_CODE=0 make publish_provider_contract; \
	else \
		EXIT_CODE=1 make publish_provider_contract; \
	fi;
	make can_i_deploy $(DEPLOY_TARGET)

publish_provider_contract:
	@echo "\n========== STAGE: publish-provider-contract (spec + results) ==========\n"
	${PACT_CLI} pactflow publish-provider-contract \
	  ${OAS_PATH} \
	  --provider ${PACTICIPANT} \
	  --provider-app-version ${GIT_COMMIT} \
	  --branch ${GIT_BRANCH} \
	  --content-type application/yaml \
	  --verification-exit-code=${EXIT_CODE} \
	  --verification-results "${MOUNT}/$(shell find ${LOCAL_REPORT_DIR_PATH} -name "verification.*.result" -type f | head -1)" \
	  --verification-results-content-type ${REPORT_FILE_CONTENT_TYPE} \
	  --verifier ${VERIFIER_TOOL} \
	  --verifier-version $(shell drift --version | cut -d " " -f4)

## =====================
## Deploy tasks
## =====================

deploy: deploy_app record_deployment

no_deploy:
	@echo "Not deploying as not on master branch"

can_i_deploy: .env
	${PACT_CLI} broker can-i-deploy --pacticipant ${PACTICIPANT} --version ${GIT_COMMIT} --to-environment production

deploy_app:
	@echo "Deploying to production"

record_deployment: .env
	@${PACT_CLI} broker record_deployment --pacticipant ${PACTICIPANT} --version ${GIT_COMMIT} --environment production

## ======================
## Misc
## ======================

.env:
	touch .env

clean:
	mkdir -p ${LOCAL_REPORT_DIR_PATH} && rm -rf ${LOCAL_REPORT_DIR_PATH}/*