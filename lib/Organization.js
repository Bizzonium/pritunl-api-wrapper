const { to } = require('await-to-js');

const Authentication = require('./Authentication');

class Organization extends Authentication {
    constructor(props){
        super(props);
    }

    async listOrganizations(){
        try{
            let res = await super.authorizedRequest({
                method: "GET",
                path: "/organization"
            });
            return res.data;
        } catch(err){
            console.log(err);
        }
    }

    async findOrganizationByName(orgName="DEFAULT ORG"){
        var foundOrg;
        try{
            let res = await super.authorizedRequest({
                method: "GET",
                path: "/organization"
            });
            for (let org of res.data){
                if(org.name.toUpperCase() == orgName.toUpperCase()){
                    foundOrg = org;
                    break;
                }
            }
        } catch(err){
            console.log(err);
        }
        if(foundOrg){ return foundOrg }
        else{ console.log(`Couldn't find ${orgName}`) }
    }

    async getOrganisationById(organisationId) {
        const [err, res] = await to(super.authorizedRequest({
            method: 'GET',
            path: `/organization/${organisationId}`,
        }));

        if (err) {
            if (err.response.status === 404) {
                return null;
            }
            throw err;
        }

        return res.data;
    }
}

module.exports = Organization;