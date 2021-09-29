const fs = require('fs');
const path = require('path');
const { IncomingMessage } = require('http');

const contentDisposition = require('content-disposition');

const Authentication = require('./Authentication');

class Key extends Authentication {
    constructor(props){
        super(props);
    }

    async downloadUsersClientConfigs(orgId, userArr, destDir){
        if(userArr.length){
            return await Promise.all(
                userArr.map(async (user) => {
                    try{
                        let res = await super.authorizedRequest({
                            method: "GET",
                            path: `/key/${orgId}/${user.id}.tar`
                        });
                        let fileData = JSON.parse(JSON.stringify(res.data));
                        let configDownloadFilePath = path.join(destDir, `${user.name}.ovpn`);
                        if(fs.existsSync(configDownloadFilePath)){
                            configDownloadFilePath = path.join(destDir, `${user.name}-${user.id}.ovpn`);
                        };
                        console.log(`Writing ${user.name}'s config to ${configDownloadFilePath}`);
                        fs.writeFile(configDownloadFilePath, fileData.slice(fileData.indexOf("#{"), fileData.indexOf("</key>")+7), () => {});
                    } catch(err){
                        console.log(err);
                    }
                })
            );
        }
        else{
            console.log("userArr argument is empty");
        }
    }

    async downloadUserClientConfig(orgId, userObj, destDir, fileName){
        if(Object.entries(userObj).length){
            try{
                let res = await super.authorizedRequest({
                    method: "GET",
                    path: `/key/${orgId}/${userObj.id}.tar`
                });
                let fileData = JSON.parse(JSON.stringify(res.data));
                let destFileName = fileName || `${userObj.name}.ovpn`;
                let configDownloadFilePath = path.join(destDir, destFileName);
                console.log(`Writing ${userObj.name}'s config to ${configDownloadFilePath}`);
                fs.writeFileSync(configDownloadFilePath, fileData.slice(fileData.indexOf("#{"), fileData.indexOf("</key>")+7));
            } catch(err){
                console.log(err);
            }
        }
        else{
            console.log("userObj argument is empty");
        }
    }

    /**
     * @typedef {object} GetUserClientConfigStreamResponse
     * @property {IncomingMessage} stream
     * @property {string} fileName
     * @property {number} [fileSize]
     */
    /**
     * @param {string} organisationId ID of the organisation containing the target user.
     * @param {string} userId ID of the user to fetch config(s) for.
     * @param {object} [options] 
     * @param {object} [options.server] Server to fetch the client config for. If not set,
     * all of the user's configs will be packaged into an archive to form the response.
     * @param {'zip'|'tar'|'onc'} [options.format] Ignored when `server` is set, in which
     * case only a single .ovpn profile is ever retrieved.
     * 
     * @returns {Promise<GetUserClientConfigStreamResponse>}
     */
    async getUserClientConfigStream(organisationId, userId, options) {
        options = options instanceof Object ? options : {};

        const archiveFormat = ['zip', 'tar', 'onc'].includes(options.format)
            ? options.format
            : 'zip';
        
        const configUrlPath = typeof options.server === 'string'
            ? `/key/${organisationId}/${userId}/${options.server}.key`
            : `/key/${organisationId}/${userId}.${archiveFormat}`;

        const resp = await super.authorizedRequest({
            method: 'GET',
            path: configUrlPath,
            responseType: 'stream',
        });

        // Ensure we've a proper download response. 
        if (typeof resp.headers['content-disposition'] !== 'string') {
            throw new Error('Failed to stream user key data. The "content-disposition" header is not present.');
        }
        const contentDispositionInfo = contentDisposition.parse(resp.headers['content-disposition']);
        if (typeof contentDispositionInfo.parameters.filename !== 'string') {
            resp.data.destroy();
            throw new Error('Failed to stream user key data. The "content-disposition" header lacks a filename.');
        }

        return {
            stream: resp.data,
            fileName: contentDispositionInfo.parameters.filename,
            fileSize: isFinite(+resp.headers['content-length']) ? +resp.headers['content-length'] : undefined,
        };
    }

}

module.exports = Key;