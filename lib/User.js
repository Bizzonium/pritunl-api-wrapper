const fs = require('fs');
const path = require('path');

const { to } = require('await-to-js');

const Authentication = require('./Authentication');

/**
 * @typedef {object} UserInfo
 * @property {string} id
 * @property {string} organization
 * @property {string} organization_name
 * @property {string} name
 * @property {string} email
 * @property {*[]} groups
 * @property {boolean} pin
 * @property {string} type
 * @property {string} auth_type
 * @property {string|null} yubico_id
 * @property {string|null} otp_secret
 * @property {boolean} disabled
 * @property {boolean} audit
 * @property {boolean} status
 * @property {ServerInfo[]} servers
 */
/**
 * @typedef {object} ServerInfo
 * @property {string} id
 * @property {string} name
 * @property {boolean} status
 * @property {string} server_id
 */
/**
 * @typedef {object} FindUsersResponse
 * @property {number} limit
 * @property {number} totalUserCount
 * @property {number} totalServerCount
 * @property {UserInfo[]} users
 */

class User extends Authentication {
    constructor(props){
        super(props);
    }

    async listUsers(orgId){
        try{
            let res = await super.authorizedRequest({
                method: "GET",
                path: `/user/${orgId}`
            });
            return res.data;
        } catch(err){
            console.log(err);
        }
    }

    /**
     * @param {string} organisationId ID of the organisation to search within. 
     * @param {string} searchQuery Raw text to search for.
     * @param {object} [searchOptions] Additional options used to control the search.
     * @param {number} [searchOptions.limit=25] Maximum number of users to return.
     * @returns {Promise<FindUsersResponse>}
     */
    async findUsers(organisationId, searchQuery, searchOptions) {
        searchOptions = {
            limit: (searchOptions && searchOptions.limit) || 25,
        };

        const res = await super.authorizedRequest({
            method: 'GET',
            path: `/user/${organisationId}`,
            params: {
                search: searchQuery,
                ...searchOptions,
            },
        });

        return {
            limit: res.data.search_limit,
            totalUserCount: res.data.search_count,
            totalServerCount: res.data.server_count,
            users: res.data.users,
        };
    }

    async createUser(orgId, params = {}){
        let defaultParams = {
            name: "default-user",
            email: "",
            disabled: false,
            yubico_id: "",
            groups: [],
            pin: "",
            network_links: [],
            bypass_secondary: false,
            client_to_client: false,
            dns_servers: [],
            dns_suffix: "",
            port_forwarding: []
        };
        params = Object.assign({}, defaultParams, params);
        
        const res = await super.authorizedRequest({
            method: 'POST',
            path: `/user/${orgId}`,
            data: params,
        });
        
        if (!Array.isArray(res.data) || res.data.length !== 1) {
            throw new Error(
                `Failed to create user. Expected a single-item array but instead received: (${typeof res.data}) ${res.data}`
            );
        }

        const [outUser] = res.data;
        // Normalise such that `servers` is always an array.
        outUser.servers = Array.isArray(outUser.servers) ? outUser.servers : [];

        return outUser;
    }

    async createUsers(orgId, userParamsArr){        
        try{
            let res = await super.authorizedRequest({
                method: "POST",
                path: `/user/${orgId}/multi`,
                data: userParamsArr
            });
            
            if(res.data){ 
                let createdUsers = res.data;            
                console.log(`${createdUsers.length} users have been created!`);
            }
        } catch(err){
            console.log(err);
        };
    }

    async updateUser(orgId, userObj, params){
        let userUpdateObject = Object.assign(userObj, params);
        const res = await super.authorizedRequest({
            method: "PUT",
            path: `/user/${orgId}/${userObj.id}`,
            data: userUpdateObject,
        });
        
        if (res.data) {
            return res.data;
        }
    }

    async deleteUser(orgId, userObj){      
        try{
            let res = await super.authorizedRequest({
                method: "DELETE",
                path: `/user/${orgId}/${userObj.id}`
            });
            if(res.data){ console.log(`User: ${userObj.name}(${userObj.id}) was deleted from the ${userObj.organization_name} organization!`) }
        } catch(err){
            console.log(err);
        }
    }
    
    async deleteUsers(orgId, userObjArr){
        if(userObjArr.length){
            return await Promise.all(
                userObjArr.map( async (user) => {
                    try{
                        let res = await super.authorizedRequest({
                            method: "DELETE",
                            path: `/user/${orgId}/${user.id}`
                        });
                        if(res.data){ console.log(`User: ${user.name}(${user.id}) was deleted from the ${user.organization_name} organization!`) }
                    } catch(err){
                        console.log(err);
                    }
                })
            );
        }
    }

    async getUserAuditLog(orgId, userObj, destDir, filename){
        try{
            let res = await super.authorizedRequest({
                method: "GET",
                path: `/user/${orgId}/${userObj.id}/audit`
            });
            if(res.data){
                if(destDir && fs.existsSync(destDir)){
                    let destFileName = filename || `${userObj.name}-log.json`;
                    let destPath = path.join(destDir, destFileName);
                    await fs.writeFile(destPath, JSON.stringify(res.data), () => {});
                    console.log(`User log file for ${user.name} written to ${destPath}`);
                }
                return res.data;
            }
        } catch(err){
            console.log(err);
        }        
    }

    async getUsersAuditLogs(orgId, userObjArr, destDir){
        if(userObjArr.length){
            return await Promise.all(
                userObjArr.map(async (user) => {
                    try{
                        let res = await super.authorizedRequest({
                            method: "GET",
                            path: `/user/${orgId}/${user.id}/audit`
                        });
                        if(res.data){
                            if(destDir && fs.existsSync(destDir)){
                                let destFileName = `${user.name}-log.json`;
                                let destPath = path.join(destDir, destFileName);
                                await fs.writeFile(destPath, JSON.stringify(res.data), () => {});
                                console.log(`User log file for ${user.name} written to ${destPath}`);
                            }
                            return res.data;
                        }
                    } catch(err){
                        console.log(err);
                    }    
                })
            );
        }
    }

    async generateUserDefaultParams(usernameArr, params){
        let defaultParams = {
            name: "default-user",
            email: "",
            disabled: false,
            yubico_id: "",
            groups: [],
            pin: "",
            network_links: [],
            bypass_secondary: false,
            client_to_client: false,
            dns_servers: [],
            dns_suffix: "",
            port_forwarding: []
        };
        params = Object.assign({}, defaultParams, params);
        
        let userDefaultParamsArr = usernameArr.map((username) => {
            return {
                ...params,
                name: username
            }
        });

        return userDefaultParamsArr;
    }

    /**
     * Fetches a user matching the given ID.
     * 
     * @param {string} organisationId ID of the organisation containing the user.
     * @param {string} userId ID of the user to fetch.
     * 
     * @returns {UserInfo|null} Returns the user matching the given ID, or `null` if no
     * such user-organisation pair exists.
     */
    async getUserById(organisationId, userId) {
        const [err, res] = await to(super.authorizedRequest({
            method: 'GET',
            path: `/user/${organisationId}/${userId}`,
        }));

        if (err) {
            if (err.response.status === 404) {
                return null;
            }
            throw err;
        }

        return res.data;
    }

    async getUserKeyLinks(organisationId, userId) {
        const [err, res] = await to(super.authorizedRequest({
            method: 'GET',
            path: `/key/${organisationId}/${userId}`,
        }));

        return res.data;
    }

}

module.exports = User;