   module.exports = [
     {
       files: ["./**/*.js"],
       extends: ["eslint:recommended"],
       parserOptions: {
         ecmaVersion: 2021,
         sourceType: "module",
       },
       env: {
         browser: true,
         node: true,
       },
       rules: {
         // Your custom rules here
       },
     },
   ];
