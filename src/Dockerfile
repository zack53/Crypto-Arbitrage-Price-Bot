FROM node:16

RUN adduser kubeuser
USER kubeuser
WORKDIR /home/kubeuser

COPY package.json ./
COPY package-lock.json ./
USER root
RUN npm install
USER kubeuser

COPY EVMAddresses EVMAddresses/
COPY ArbitrageBot.js ./
COPY util util/
COPY .env ./
COPY artifacts/contracts/AaveFlashLoanV3.sol/AaveFlashLoanV3.json artifacts/contracts/AaveFlashLoanV3.sol/AaveFlashLoanV3.json
RUN mkdir tmp

CMD /bin/sh