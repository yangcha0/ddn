import node from '../node';

async function createPluginAsset(type, asset, secret, secondSecret) {
    return await node.ddn.assetPlugin.createPluginAsset(type, asset, secret, secondSecret)
}

describe("AOB Test", () => {
    // 加载插件
    node.ddn.init();

    it ("开启白名单 Should be ok", async() => {
        const obj = {
            currency: "DDD.NCR",
            flag: 1,
            flag_type: 1
        };
        const transaction = await createPluginAsset(62, obj, node.Eaccount.password, "DDD12345");
        await new Promise((resolve, reject) => {
            node.peer.post("/transactions")
                .set("Accept", "application/json")
                .set("version", node.version)
                .set("nethash", node.config.nethash)
                .set("port", node.config.port)
                .send({ transaction })
                .expect("Content-Type", /json/)
                .expect(200)
                .end((err, {body}) => {
                    // console.log('res.body', res.body);

                    if (err) {
                        return reject(err);
                    }

                    node.expect(body).to.have.property("success").to.be.true;

                    resolve();
                });
        });
    })

    it("资产转账 Should be fail", async () => {
        await node.onNewBlockAsync();

        const obj = {
            recipient_id: node.Daccount.address,
            currency: "DDD.NCR",
            aobAmount: "10",
            message: '测试转账',
            fee: '0',
        };

        const transaction = await createPluginAsset(65, obj, node.Eaccount.password, "DDD12345");
        await new Promise((resolve, reject) => {
            node.peer.post("/transactions")
                .set("Accept", "application/json")
                .set("version", node.version)
                .set("nethash", node.config.nethash)
                .set("port", node.config.port)
                .send({ transaction })
                .expect("Content-Type", /json/)
                .expect(200)
                .end((err, {body}) => {
                    // console.log(res.body);

                    if (err) {
                        return reject(err);
                    }

                    node.expect(body).to.have.property("success").to.be.false;
                    node.expect(body).to.have.property("error").equal("Permission not allowed.");

                    resolve();
                });
        });
    })

    it ("增加Daccount到白名单 Should be ok", async() => {
        const obj = {
            currency: "DDD.NCR",
            flag: 1,
            operator: "+",
            list: [
                node.Daccount.address
            ].join(",")
        };
        const transaction = await createPluginAsset(63, obj, node.Eaccount.password, "DDD12345");
        await new Promise((resolve, reject) => {
            node.peer.post("/transactions")
                .set("Accept", "application/json")
                .set("version", node.version)
                .set("nethash", node.config.nethash)
                .set("port", node.config.port)
                .send({ transaction })
                .expect("Content-Type", /json/)
                .expect(200)
                .end((err, {body}) => {
                    // console.log('res.body', res.body);

                    if (err) {
                        return reject(err);
                    }

                    node.expect(body).to.have.property("success").to.be.true;

                    resolve();
                });
        });
    });

    it("资产转账 Should be ok", async () => {
        await node.onNewBlockAsync();

        const obj = {
            recipient_id: node.Daccount.address,
            currency: "DDD.NCR",
            aobAmount: "10",
            message: '测试转账',
            fee: '0',
        };

        const transaction = await createPluginAsset(65, obj, node.Eaccount.password, "DDD12345");
        await new Promise((resolve, reject) => {
            node.peer.post("/transactions")
                .set("Accept", "application/json")
                .set("version", node.version)
                .set("nethash", node.config.nethash)
                .set("port", node.config.port)
                .send({ transaction })
                .expect("Content-Type", /json/)
                .expect(200)
                .end((err, {body}) => {
                    // console.log(res.body);

                    if (err) {
                        return reject(err);
                    }

                    node.expect(body).to.have.property("success").to.be.true;

                    resolve();
                });
        });
    })

    it ("在白名单删除Daccount Should be ok", async() => {
        const obj = {
            currency: "DDD.NCR",
            flag: 1,
            operator: "-",
            list: [
                node.Daccount.address
            ].join(",")
        };
        const transaction = await createPluginAsset(63, obj, node.Eaccount.password, "DDD12345");
        await new Promise((resolve, reject) => {
            node.peer.post("/transactions")
                .set("Accept", "application/json")
                .set("version", node.version)
                .set("nethash", node.config.nethash)
                .set("port", node.config.port)
                .send({ transaction })
                .expect("Content-Type", /json/)
                .expect(200)
                .end((err, {body}) => {
                    // console.log('res.body', res.body);

                    if (err) {
                        return reject(err);
                    }

                    node.expect(body).to.have.property("success").to.be.true;

                    resolve();
                });
        });
    });

    it("资产转账 Should be fail", async () => {
        await node.onNewBlockAsync();

        const obj = {
            recipient_id: node.Daccount.address,
            currency: "DDD.NCR",
            aobAmount: "10",
            message: '测试转账',
            fee: '0',
        };

        const transaction = await createPluginAsset(65, obj, node.Eaccount.password, "DDD12345");
        await new Promise((resolve, reject) => {
            node.peer.post("/transactions")
                .set("Accept", "application/json")
                .set("version", node.version)
                .set("nethash", node.config.nethash)
                .set("port", node.config.port)
                .send({ transaction })
                .expect("Content-Type", /json/)
                .expect(200)
                .end((err, {body}) => {
                    // console.log(res.body);

                    if (err) {
                        return reject(err);
                    }

                    node.expect(body).to.have.property("success").to.be.false;
                    node.expect(body).to.have.property("error").equal("Permission not allowed.");

                    resolve();
                });
        });
    })

    it ("关闭白名单 Should be ok", async() => {
        const obj = {
            currency: "DDD.NCR",
            flag: 2,
            flag_type: 1
        };
        const transaction = await createPluginAsset(62, obj, node.Eaccount.password, "DDD12345");
        await new Promise((resolve, reject) => {
            node.peer.post("/transactions")
                .set("Accept", "application/json")
                .set("version", node.version)
                .set("nethash", node.config.nethash)
                .set("port", node.config.port)
                .send({ transaction })
                .expect("Content-Type", /json/)
                .expect(200)
                .end((err, {body}) => {
                    // console.log('res.body', res.body);

                    if (err) {
                        return reject(err);
                    }

                    node.expect(body).to.have.property("success").to.be.true;

                    resolve();
                });
        });
    })

    it("资产转账 Should be ok", async () => {
        await node.onNewBlockAsync();

        const obj = {
            recipient_id: node.Daccount.address,
            currency: "DDD.NCR",
            aobAmount: "10",
            message: '测试转账',
            fee: '0',
        };

        const transaction = await createPluginAsset(65, obj, node.Eaccount.password, "DDD12345");
        await new Promise((resolve, reject) => {
            node.peer.post("/transactions")
                .set("Accept", "application/json")
                .set("version", node.version)
                .set("nethash", node.config.nethash)
                .set("port", node.config.port)
                .send({ transaction })
                .expect("Content-Type", /json/)
                .expect(200)
                .end((err, {body}) => {
                    // console.log(res.body);

                    if (err) {
                        return reject(err);
                    }

                    node.expect(body).to.have.property("success").to.be.true;

                    resolve();
                });
        });
    })

});