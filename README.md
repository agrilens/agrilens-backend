## How start the server on local machine   
- 1. `cd agrilens-backend/functions`   
- 2. Run `npm run serve` // The command will excute `firebase emulators:start --only functions`     
- 3. The api endpoints will be activated at `http://127.0.0.1:5001/agrilens-web/us-central1/app`

## Dependencies:     
     
npm init -y     
npm i express     
npm i firebase-admin     
npm i nodemon     
npm i dotenv     
     
npm install -g firebase-tools     
     
     
firebase init functions          

npm run server   // Localhost serve     

### Deploy functions and verify that environment variables were loaded:          
firebase deploy --only functions               
