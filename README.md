# AgriLens Backend Repo

## Works Cited & Sources

- We used generative AI in this project. Artifacts and other documents where we used generative AI contain a note about the source and a link to the conversation. 

## Installations     
- `npm install -g firebase-tools` firebase tools for CLI. // Required only for the first time.    
- 

## How start the server on local machine   
- 1. `cd agrilens-backend/functions`      
  2. Run `npm i` to install newly added packages.    
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
`firebase deploy`  // Deploys `functions/` directory.                 
`firebase deploy --only functions`   // Deploys only the `functions`                     
