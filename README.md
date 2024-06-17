# Oracle Network  

An implementation of the oracle server and an example of a possible oracle node implementation. Serves as a proof of concept for [Internet of Value and DeFi in Solana](https://github.com/xduricai/bp-main). The oracle server coordinates the oracles via web sockets and reports data back to the smart contract, assuming it was approved by a sufficient number of oracles. Oracles fetch subscription data which is then aggregated into a single report by the leader oracle. Finally, oracles choose whether to approve or reject this report based on whether it matches up with their own data.  

## Prerequisites  

- [node.js](https://nodejs.org/en)

## Setup  

The Oracle Network is meant to be configured after the [Smart Contract](https://github.com/xduricai/bp-smart-contract) and the [Web App](https://github.com/xduricai/bp-smart-contract)   

NOTE: The Solana Development Environment is only compatible with UNIX based operating systems and will require WSL to run on Windows  

- Set the value of stateAddress inside of `./oracle-server/src/index.ts` to the one you copied during the web app initialization
- Open `/bp-smart-contract/C UsersIgor.config/solana/id.json` and copy the contents of the file into `/bp-oracle-network/id.json` - note that the name of the source directory may be different for you
- Open `/bp-oracle-network/oracle-server` and `bp-oracle-network/oracle-node` in separate terminals
- Type the following commands in both terminals to install dependencies and run the oracle network
```bash
npm install
npm run build
npm run serve
```
