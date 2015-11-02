// run test on the projects page
describe('Projects Page', function () {

    // login
    it('should log in', function () {
        browser.get('http://127.0.0.1:8000/#/login');
        browser.driver.findElement(protractor.By.id('userName')).sendKeys('admin');
        browser.driver.findElement(protractor.By.id('userPassword')).sendKeys('admin');
        browser.driver.findElement(protractor.By.id("signinButton")).click();
    });

    // add a project
    it('should add a new project', function () {
        // open the add project modal and fill in the form
        var addProjectModal = element(by.id('addProject'));
        element(by.css('a.project-button')).click();
        expect(addProjectModal.isDisplayed()).toBe(true);
        addProjectModal.element(by.model('formData.Name')).sendKeys('TestProject');
        addProjectModal.element(by.model('formData.Description')).sendKeys('Testing Project');
        var clientselect = addProjectModal.element(by.id('inputClient_chosen'))
        clientselect.click();
        browser.actions().sendKeys('TestClient').perform();
        clientselect.all(by.css('.chosen-results li')).then(function(items) {
          items[0].click();
        });
        var cityselect = addProjectModal.element(by.id('inputCity_chosen'))
        cityselect.click();
        browser.actions().sendKeys('TestCity').perform();
        cityselect.all(by.css('.chosen-results li')).then(function(items) {
          items[0].click();
        });
        addProjectModal.element(by.model('formData.SiteAddress')).sendKeys('Testing Address');
        addProjectModal.element(by.model('formData.FileNumber')).sendKeys('TEST000');

        expect(addProjectModal.element(by.buttonText('Save')).isEnabled()).toBe(true);
        addProjectModal.element(by.buttonText('Save')).click();

        // check the project was added to the open projects list
        expect(element(by.id('left')).element(by.buttonText('TestProject')).isPresent()).toBe(true);
    });

    // close a project
    it('should close a project', function () {
        // select the project
        element(by.id('left')).element(by.buttonText('TestProject')).click();
        expect(element(by.css('nav ul li a i.fa-folder')).isDisplayed()).toBe(true);
        element(by.css('nav ul li a i.fa-folder')).click();

        // check the project has closed
        expect(element(by.id('left')).element(by.buttonText('TestProject')).isPresent()).toBe(false);
    });

    // open a project
    it('should open a project', function () {
        // open the open project modal
        expect(element(by.css('nav ul li a i.fa-folder-open')).isDisplayed()).toBe(true);
        element(by.css('nav ul li a i.fa-folder-open')).click();
        browser.switchTo().activeElement().sendKeys('TestProject');
        element.all(by.css('.ac-select-list ul li')).then(function(items) {
          items[0].click();
        });

        // check the project was opened
        expect(element(by.id('left')).element(by.buttonText('TestProject')).isPresent()).toBeTruthy();
    });

    // add a budget group
    it('should add a budget group to a project', function () {
        // select the project
        element(by.id('left')).element(by.buttonText('TestProject')).click();
        expect(element(by.css('nav ul li a.budget-group-button')).isDisplayed()).toBe(true);
        element(by.css('nav ul li a.budget-group-button')).click();

        // check the budget group modal displays
        var addBudgetGroupModal = element(by.id('addBudgetGroup'));
        expect(addBudgetGroupModal.isDisplayed()).toBe(true);
        addBudgetGroupModal.element(by.model('formData.Name')).sendKeys('TestBudgetGroup');
        addBudgetGroupModal.element(by.model('formData.Description')).sendKeys('Testing BudgetGroup');
        addBudgetGroupModal.element(by.buttonText('Save')).click();

        // check the budgetgroup was added to the project
        element(by.id('left')).element(by.css('input.tree-control.collapsed')).click();
        expect(element(by.id('left')).element(by.buttonText('TestBudgetGroup')).isDisplayed()).toBe(true);
    });

    it('should edit a budget group', function () {
        // expand
        element(by.id('left')).element(by.css('input.tree-control.collapsed')).isDisplayed().then(function (isVisible) {
            if (isVisible) {
                element(by.id('left')).element(by.css('input.tree-control.collapsed')).click();
            }
        });
        element(by.id('left')).element(by.buttonText('TestBudgetGroup')).click();
        expect(element(by.css('nav ul li a i.fa-pencil')).isDisplayed()).toBe(true);
        element(by.css('nav ul li a i.fa-pencil')).click();

        // check the edit modal displays
        var editModal = element(by.id('addBudgetGroup'));
        expect(editModal.isDisplayed()).toBe(true);
        editModal.element(by.model('formData.Name')).clear().sendKeys('EditBudgetGroup');
        editModal.element(by.buttonText('Update')).click();

        // check the name
        expect(element(by.id('left')).element(by.buttonText('EditBudgetGroup')).isDisplayed()).toBe(true);

        // change the name back
        element(by.css('nav ul li a i.fa-pencil')).click();
        editModal.element(by.model('formData.Name')).clear().sendKeys('TestBudgetGroup');
        editModal.element(by.buttonText('Update')).click();
        expect(element(by.id('left')).element(by.buttonText('TestBudgetGroup')).isDisplayed()).toBe(true);
    });

    // add a resource
    it('should add a resource to a project', function () {
        // expand
        element(by.id('left')).element(by.css('input.tree-control.collapsed')).isDisplayed().then(function (isVisible) {
            if (isVisible) {
                element(by.id('left')).element(by.css('input.tree-control.collapsed')).click();
            }
        });
        element(by.id('left')).element(by.buttonText('Resource List')).click();
        expect(element(by.css('nav ul li a.resource-button')).isDisplayed()).toBe(true);
        element(by.css('nav ul li a.resource-button')).click();

        // check the resource modal displays
        var addResourceModal = element(by.id('addResource'));
        expect(addResourceModal.isDisplayed()).toBe(true);
        // send the data
        addResourceModal.element(by.model('formData.Name')).sendKeys('TestResource');
        addResourceModal.element(by.model('formData.Description')).sendKeys('Testing Resource');
        addResourceModal.element(by.model('formData.Rate')).sendKeys(10);
        var unitselect = addResourceModal.element(by.id('inputUnit_chosen'))
        unitselect.click();
        browser.actions().sendKeys('TestUnit').perform();
        unitselect.all(by.css('.chosen-results li')).then(function(items) {
          items[0].click();
        });
        var typeselect = addResourceModal.element(by.id('inputType_chosen'))
        typeselect.click();
        typeselect.all(by.css('.chosen-results li')).then(function(items) {
          items[2].click();
        });
        var supplierselect = addResourceModal.element(by.id('inputSupplier_chosen'))
        supplierselect.click();
        browser.actions().sendKeys('TestSupplier').perform();
        supplierselect.all(by.css('.chosen-results li')).then(function(items) {
          items[0].click();
        });
        addResourceModal.element(by.buttonText('Save')).click();

        // check the resource was added to the project
        expect(element(by.id('left')).element(by.buttonText('TestResource')).isDisplayed()).toBe(true);
    });

    it('should edit a resource', function () {
        element(by.buttonText('TestResource')).click();
        browser.waitForAngular();
        var slickgrid = element(by.id('optimate-data-grid'));
        slickgrid.element(by.css('div.ui-widget-content:nth-child(1) > div:nth-child(1)')).getText().then(function(txt){
            expect(txt).toBe('TestResource');
        });
        slickgrid.element(by.css('div.ui-widget-content:nth-child(1) > div:nth-child(4)')).click();
        slickgrid.element(by.css('.editor-text')).sendKeys(5);
        slickgrid.element(by.css('div.ui-widget-content:nth-child(1) > div:nth-child(1)')).click();
        // check the total has updated
        slickgrid.element(by.css('div.ui-widget-content:nth-child(1) > div:nth-child(4)')).getText().then(function(text){
            expect(text).toBe('R5.00');
        })
    });

    // edit a project
    it('should edit a project name', function () {
        // select the project
        element(by.id('left')).element(by.buttonText('TestProject')).click();
        expect(element(by.css('nav ul li a i.fa-pencil')).isDisplayed()).toBe(true);
        element(by.css('nav ul li a i.fa-pencil')).click();

        // check the edit project modal displays
        var editProjectModal = element(by.id('addProject'));
        expect(editProjectModal.isDisplayed()).toBe(true);
        editProjectModal.element(by.model('formData.Name')).clear().sendKeys('EditProject');
        editProjectModal.element(by.buttonText('Update')).click();

        // check the project name
        expect(element(by.id('left')).element(by.buttonText('EditProject')).isDisplayed()).toBe(true);

        // change the name back
        element(by.css('nav ul li a i.fa-pencil')).click();
        editProjectModal.element(by.model('formData.Name')).clear().sendKeys('TestProject');
        editProjectModal.element(by.buttonText('Update')).click();
        expect(element(by.id('left')).element(by.buttonText('TestProject')).isDisplayed()).toBe(true);
    });

    // edit markups
    it('add, edit and delete a project markups', function () {
        // select the project
        element(by.id('left')).element(by.buttonText('TestProject')).click();
        expect(element(by.css('nav ul li a i.fa-money')).isDisplayed()).toBe(true);
        element(by.css('nav ul li a i.fa-money')).click();

        // check the overhead modal
        var overheadModal = element(by.id('editOverheads'));
        expect(overheadModal.isDisplayed()).toBe(true);

        // add a markup
        overheadModal.element(by.model('newOverhead.Name')).sendKeys('ExtraOverhead');
        overheadModal.element(by.model('newOverhead.Percentage')).sendKeys('50');
        overheadModal.element(by.css('td button i.fa-plus')).click();

        // edit the markup
        overheadModal.element(by.model('newOverhead.Name')).sendKeys('TestOverhead');
        overheadModal.element(by.model('newOverhead.Percentage')).sendKeys('10');
        overheadModal.element(by.css('td button i.fa-plus')).click();
        expect(overheadModal.element(by.css('td button i.fa-pencil')).isDisplayed()).toBe(true);
        overheadModal.element(by.css('td button i.fa-pencil')).click();
        overheadModal.element(by.model('overhead.Name')).clear().sendKeys('edited overhead');
        expect(overheadModal.element(by.css('td button i.fa-check')).isDisplayed()).toBe(true);
        overheadModal.element(by.css('td button i.fa-check')).click();

        // delete the markup
        expect(overheadModal.element(by.css('td button i.fa-trash')).isDisplayed()).toBe(true);
        overheadModal.element(by.css('td button i.fa-trash')).click();

        overheadModal.element(by.buttonText('Done')).click();
    });

    // add a budgetitem
    it('should add a budget item to a project', function () {
        // expand
        element(by.id('left')).element(by.css('input.tree-control.collapsed')).isDisplayed().then(function (isVisible) {
            if (isVisible) {
                element(by.id('left')).element(by.css('input.tree-control.collapsed')).click();
            }
        });
        element(by.id('left')).element(by.buttonText('TestBudgetGroup')).click();
        expect(element(by.css('nav ul li a.budget-item-button')).isDisplayed()).toBe(true);
        element(by.css('nav ul li a.budget-item-button')).click();

        // check the item modal displays
        var addModal = element(by.id('addBudgetItem'));
        expect(addModal.isDisplayed()).toBe(true);
        var selectButton = addModal.element(by.css('div.ui-select-container'));
        var selectInput = selectButton.element(by.css('.ui-select-search'));
        // click to open select
        addModal.element(by.css('div.ui-select-container div.ui-select-match span.ui-select-input')).click();
        // send text
        selectInput.sendKeys('TestResource');
        // select first element
        element.all(by.css('.ui-select-choices-row-inner span')).first().click();
        addModal.element(by.model('formData.Quantity')).sendKeys(10);
        addModal.element(by.css('button.custom-checkbox')).click();
        addModal.element(by.buttonText('Save')).click();

        // check the budget item was added to the project
        expect(element(by.id('left')).element(by.buttonText('TestResource')).isDisplayed()).toBe(true);
    });

    it('should edit a budget item', function () {
        element.all(by.buttonText('TestResource')).then(function(items) {
            items[1].click();
        });
        browser.waitForAngular();
        var slickgrid = element(by.id('optimate-data-grid'));
        slickgrid.element(by.css('div.ui-widget-content:nth-child(1) > div:nth-child(1)')).getText().then(function(txt){
            expect(txt).toBe('TestResource');
        });
        slickgrid.element(by.css('div.ui-widget-content:nth-child(1) > div:nth-child(3)')).click();
        slickgrid.element(by.css('.editor-text')).sendKeys(20);
        slickgrid.element(by.css('div.ui-widget-content:nth-child(1) > div:nth-child(1)')).click();
        // check the total has updated
        element(by.id('left')).element(by.buttonText('TestBudgetGroup')).click();
        slickgrid.element(by.css('div.ui-widget-content:nth-child(2) > div:nth-child(7)')).getText().then(function(txt){
            expect(txt).toBe('R110.00');
        });
    });

    // copy and paste a project
    it('should copy and paste a project', function () {
        // select the project
        element(by.id('left')).element(by.buttonText('TestProject')).click();
        expect(element(by.css('nav ul li a i.fa-files-o')).isDisplayed()).toBe(true);
        element(by.css('nav ul li a i.fa-files-o')).click();

        // check the paste function displays
        expect(element(by.css('nav ul li a i.fa-clipboard')).isDisplayed()).toBe(true);
        element(by.css('nav ul li a i.fa-clipboard')).click();
        expect(element(by.buttonText('Paste')).isDisplayed()).toBe(true);
        element(by.buttonText('Paste')).click();

        // check the copied project name
        expect(element(by.id('left')).element(by.buttonText('Copy of TestProject')).isDisplayed()).toBe(true);
    });

    // delete a project
    it('should delete a project', function () {
        // select the project
        element(by.id('left')).element(by.buttonText('Copy of TestProject')).click();
        expect(element(by.css('nav ul li a i.fa-trash')).isDisplayed()).toBe(true);
        element(by.css('nav ul li a i.fa-trash')).click();

        // check the confirmation modal
        element(by.buttonText('Delete')).click();

        // check the project has been deleted
        expect(element(by.id('left')).element(by.buttonText('Copy of TestProject')).isPresent()).toBe(false);
    });
});
