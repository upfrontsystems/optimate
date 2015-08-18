server README
for setting up the server side of the Optimate project
======================================================

Getting Started in development mode
-----------------------------------
- Ensure you have python and sqlite installed in you system
	If not you can follow the installation steps here: http://docs.pylonsproject.org/projects/pyramid/en/latest/tutorials/wiki2/installation.html

- cd <directory containing this file>

    virtualenv .
    ./bin/pip install -e src/optimate.app/

- Ensure you have the database file, server.sqlite, in the current folder

- Start the server by running:
    ./bin/pserve development.ini --reload

- Going to http://127.0.0.1:8100/ will show the login page

- To run server unit tests
	(in this directory and with the virtualenv set up)
	bin/nosetests -s src/optimate.app/optimate/app/tests

- Build the database tables by running:
    ./bin/initialize_server_db development.ini

- To run the populate database script:
	Note: this will replace the current server.sqlite file in this directory
		Also, it is assumed a folder named 'exceldata' is in this directory
		containing the excel spreadsheets, as well as a folder data.csv
		with the csv data
	./bin/python src/optimate.app/optimate/app/scripts/csvpopulatedb.py


=================================================================================

Client README
for setting up the client in the Optimate Project
-----------------------------------------------

- Ensure you have NodeJS installed on your system

- cd <directory containing this file>
- cd theme

- Download the tool dependencies by running:
	npm install

- Start the client server by running:
	npm start

- The client server will start and the Optimate root view can be accessed via
	http://127.0.0.1:8000

- Enter your login details in the login page

- To run client side tests:
    Ensure you have protractor installed, if not follow the instructions at:
        http://www.protractortest.org/

    Start the selenium server with:
        webdriver-manager start

    In a new terminal:
        cd <directory containing this file>
        protractor theme/test/conf.js
