const fs = require('fs');
const readline = require('readline');
const {
    google
} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const TOKEN_PATH = 'token.json';

var araxxi_paths = '';
var rots_path = '';
var vorago_rotation = [];

var next_check = 0;

var lookup = () => {

    function readData(callback) {

        read((auth) => {
            const calendar = google.calendar({
                version: 'v3',
                auth
            });
            calendar.events.list({
                calendarId: 't6utjt4pdr65sm8v644uckbabc@group.calendar.google.com',
                timeMin: (new Date()).toISOString(),
                maxResults: 3,
                singleEvents: true,
                orderBy: 'startTime',
            }, (err, res) => {
                if (err) return console.log('The API returned an error: ' + err);
                const events = res.data.items;
                if (events.length) {
                    for (var i = 0; i < events.length; i++) {
                        var event = events[i];
                        if (event.location.includes('Vorago')) {
                            vorago_rotation[0] = event.summary.match(/(?<=\= )(.*?)(?= \[)/)[0]; //returns normal rotation
                            if (!event.description) continue;
                            var rotations = event.description.split('\n');
                            vorago_rotation[1] = `${rotations[1]}, ${rotations[2]}, ${rotations[3]}`
                        } else if (event.summary.includes('ROTS'))
                            rots_path = event.description;
                        else if (event.location.includes('Araxyte')) {
                            var paths = event.description.split('\n');
                            for (var k = 0; k < paths.length; k++) {
                                var path = paths[k];
                                var pathName = path.match(/(?<=\()(.*?)(?=\))/);
                                pathName = pathName[0];
                                pathName = pathName.charAt(0).toUpperCase() + pathName.substring(1, pathName.length).toLowerCase();
                                path = path.substring(0, path.indexOf('(') - 1);
                                path += ` - (${pathName})`;
                                paths[k] = path;
                            }
                            araxxi_paths = paths.join(' and ');
                        }
                    }
                    if (callback) callback();
                } else {
                    console.log('No upcoming events found.');
                }
            });
        });
    }

    function read(callback) {
        fs.readFile('credentials.json', (err, content) => {
            if (err) return console.log('Error loading client secret file:', err);
            // Authorize a client with credentials, then call the Google Calendar API.
            authorize(JSON.parse(content), callback);
        });
    }

    /**
     * Create an OAuth2 client with the given credentials, and then execute the
     * given callback function.
     * @param {Object} credentials The authorization client credentials.
     * @param {function} callback The callback to call with the authorized client.
     */
    function authorize(credentials, callback) {
        const {
            client_secret,
            client_id,
            redirect_uris
        } = credentials.installed;
        const oAuth2Client = new google.auth.OAuth2(
            client_id, client_secret, redirect_uris[0]);

        // Check if we have previously stored a token.
        fs.readFile(TOKEN_PATH, (err, token) => {
            if (err) return getAccessToken(oAuth2Client, callback);
            oAuth2Client.setCredentials(JSON.parse(token));
            callback(oAuth2Client);
        });
    }

    /**
     * Get and store new token after prompting for user authorization, and then
     * execute the given callback with the authorized OAuth2 client.
     * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
     * @param {getEventsCallback} callback The callback for the authorized client.
     */
    function getAccessToken(oAuth2Client, callback) {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });
        console.log('Authorize this app by visiting this url:', authUrl);
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question('Enter the code from that page here: ', (code) => {
            rl.close();
            oAuth2Client.getToken(code, (err, token) => {
                if (err) return console.error('Error retrieving access token', err);
                oAuth2Client.setCredentials(token);
                // Store the token to disk for later program executions
                fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                    if (err) console.error(err);
                    console.log('Token stored to', TOKEN_PATH);
                });
                callback(oAuth2Client);
            });
        });
    }

    function processMessage(author, commandLine, command, split, discordQueue, runescapeQueue) {
        switch (command.toLowerCase()) {
            case 'naraxxi':
                runescapeQueue.push([`Current Araxxor paths: ${araxxi_paths}.`, undefined, new Date()]);
                break;
            case 'rots':
                runescapeQueue.push([`Current ROTS rotation: ${rots_path}`, undefined, new Date()]);
                break;
            case 'vorago':
                runescapeQueue.push([`Current Vorago rotation: ${vorago_rotation[0]}. Hard mode: ${vorago_rotation[1]}.`, undefined, new Date()]);
                break;
        }
    }

    return {

        getRunescapeCommands: () => {
            return ['araxxi', 'rots', 'vorago'];
        },

        processRunescapeMessage: (author, commandLine, command, split, discordQueue, runescapeQueue) => {
            if (next_check <= new Date().getTime()) {
                readData(() => processMessage(author, commandLine, command, split, discordQueue, runescapeQueue));
                return;
            }
            processMessage(author, commandLine, command, split, discordQueue, runescapeQueue);
        }

    };

};
module.exports = lookup;