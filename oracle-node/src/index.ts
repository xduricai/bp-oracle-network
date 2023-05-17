import { OracleNode } from "./oracle-node.js";

const nodes: OracleNode[] = [];

const response = [
    { id: "1" },
    { id: "2" },
    { id: "3" },
]

response.forEach(node => {
    const oracleNode = new OracleNode(node.id);
    nodes.push(oracleNode);
    oracleNode.serve();
});

/*
setTimeout(() => {
    const oracleNode = new OracleNode('4');
    nodes.push(oracleNode);
    oracleNode.serve();
}, 5000) */