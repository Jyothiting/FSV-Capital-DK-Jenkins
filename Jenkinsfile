pipeline {

    agent any

    environment {
        DEPLOY_SERVER = '13.206.100.195'
        DEPLOY_USER   = 'ubuntu'
        APP_DIR       = '/home/ubuntu/FSV-Capital-DK-Jenkins'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Deploy') {
            steps {

                sshagent(['deployment-ssh']) {

                    sh """
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_SERVER} '
                            cd ${APP_DIR} &&
                            git pull origin main &&
                            docker compose down &&
                            docker compose build &&
                            docker compose up -d
                        '
                    """
                }
            }
        }

        stage('Verify') {
            steps {

                sshagent(['deployment-ssh']) {

                    sh """
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_SERVER} '
                            cd ${APP_DIR} &&
                            docker compose ps &&
                            curl -f http://localhost:8000/health
                        '
                    """
                }
            }
        }
    }

    post {
        success {
            echo 'Deployment successful!'
        }

        failure {
            echo 'Deployment failed!'
        }
    }
}
