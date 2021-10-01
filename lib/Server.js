const Authentication = require('./Authentication');

class Server extends Authentication {
    constructor(props){
        super(props);
    }

    async listServers() {
        const res = await super.authorizedRequest({
            method: 'GET',
            path: '/server',
        });
        return res.data;
    }
}

module.exports = Server;
