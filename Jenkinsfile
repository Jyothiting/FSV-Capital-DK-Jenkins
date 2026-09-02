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
                            git pull origin master &&
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

                            for i in 1 2 3 4 5 6; do
                                echo "Health check attempt \$i..."

                                if curl -f http://localhost:8000/health; then
                                    echo "Backend is healthy!"
                                    exit 0
                                fi

                                sleep 5
                            done

                            echo "Backend health check failed"
                            docker logs --tail 100 fsv-backend
                            exit 1
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

