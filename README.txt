server README
for setting up the server side of the Optimate project
==================

Getting Started in development mode
---------------
- Ensure you have python along with pyramid and sqlite installed in you system
	If not you can follow the installation steps here: http://docs.pylonsproject.org/projects/pyramid/en/latest/tutorials/wiki2/installation.html

- cd <directory containing this file>

- (Assuming you installed pyramid in a virtual enviroment)
	$VENV/bin/python setup.py develop

- Build the SQLite database by running:
	$VENV/bin/initialize_server_db development.ini

- Note: currently by default no data is input in the database, this is done seperately using populatedb.py 
	and the Optimate excel files
	To fully run the project ensure you have server.sqlite in the current directory.

- Start the server by running:
	$VENV/bin/pserve development.ini

- Going to http://127.0.0.1:8100/ will show the default home page which is all the items with the root
  as their parent.

===================

client README
for setting up the client in the Optimate Project
-----------------------------------------------

- Ensure you have NodeJS installed on your system

- cd client

- Download the tool dependencies by running:
	npm install

- Start the client server by running:
	npm start

- The client server will start and the Optimate root view can be accessed via
	http://127.0.0.1:8000

- Clicking on a node label will load it's children and display a "+" next to it

- Clicking on the "+" will display a dialog menus of options
	- Add
	- Copy
  - Paste
	- Delete
	- Calculate cost







