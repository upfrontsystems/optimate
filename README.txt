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

- Build the SQLite database by running:
    ./bin/initialize_server_db development.ini

- Note: currently by default no data is input in the database, this is done seperately using populatedb.py 
	and the Optimate excel files
	To fully run the project ensure you have server.sqlite in the current directory.

- Start the server by running:
    ./bin/pserve development.ini --reload

- Going to http://127.0.0.1:8100/ will show the default home page which is all the items with the root
  as their parent.

- To run server tests
	(in this directory and with the virtualenv set up)
	./bin/python src/optimate.app/setup.py test -q

- To run populatedb.py
	Note: this will replace the current server.sqlite file in this directory
		Also, it is assumed a folder named 'exceldata' is in this directory
		containing the excel spreadsheets
	./bin/python src/optimate.app/optimate/app/scripts/populatedb.py
	

=================================================================================

client README
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

- Clicking on a node label will display the costs of the children of this 
	node in the Slickgrid, as well as display the menu button to the 
	right of the label

- Clicking on the node '+' icon will load the children of that node, clicking
	the '-' icon will collapse the tree. An empty box indicates the node 
	has no children.

- Clicking on the "" will display a dialog menus of options
	- Add
	- Copy
  	- Paste
	- Delete
	- Calculate cost
