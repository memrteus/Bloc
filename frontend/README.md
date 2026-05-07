# Frontend

Angular client for Bloc.

## Purpose

- render the campus map experience
- show active sidequests
- support sidequest creation and joining flows

## Status

Scaffold only. No feature views, storage integration, or advanced auth has been implemented yet.

## Run Frontend Tests

# Watch mode - tests re-run on file changes
npm test

# Single run with coverage report
npm run test:ci

# Current Tests
-app.component.spec.ts - Component lifecycle and theme testing
-auth-api.service.spec.ts - Service with HTTP mocking
-app-config.service.spec.ts - Simple service configuration testing
-login-page.component.spec.ts - Component with form validation and error handling

Jasmine with Karmine installation:
-Ran this line inside of frontend:
npm install --save-dev jasmine-core karma karma-chrome-launcher karma-coverage karma-jasmine karma-jasmine-html-reporter @angular/platform-browser-dynamic

-Check that the installation was complete:
npm list karma jasmine-core --dept

-installed testing dependencies for jasmine, karma and angular
-created configuration files in karma.conf.js, src/test.ts, tsconfig.spec.json
-Updated existing files angular.json with test configuration and package.json
-added test connfiguration to angular.json
-updated README.md with info on tests