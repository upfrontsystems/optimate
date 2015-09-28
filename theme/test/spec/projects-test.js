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
        clientselect.all(by.css('.chosen-results li')).then(function(items) {
          items[2].click();
        });
        var cityselect = addProjectModal.element(by.id('inputCity_chosen'))
        cityselect.click();
        cityselect.all(by.css('.chosen-results li')).then(function(items) {
          items[2].click();
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
        var selectProjectModal = element(by.id('selectProjectModal'));
        expect(selectProjectModal.isDisplayed()).toBe(true);
        var projectselect = selectProjectModal.element(by.id('project_select_chosen'))
        projectselect.click();
        projectselect.element(by.css('.chosen-search input')).sendKeys('TestProject');
        projectselect.all(by.css('.chosen-results li')).then(function(items) {
          items[0].click();
        });
        selectProjectModal.element(by.css('.modal-footer .btn-primary')).click();

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
        // delete it
        element(by.id('left')).element(by.buttonText('Copy of TestProject')).click();
        element(by.css('nav ul li a i.fa-trash')).click();
        element(by.id('deleteConfirmation')).element(by.buttonText('Delete')).click();
        expect(element(by.id('left')).element(by.buttonText('Copy of TestProject')).isPresent()).toBe(false);
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
        overheadModal.element(by.model('newOverhead.Name')).sendKeys('TestOverhead');
        overheadModal.element(by.model('newOverhead.Percentage')).sendKeys('50');
        overheadModal.element(by.css('td button i.fa-plus')).click();

        // edit the markup
        expect(overheadModal.element(by.css('td button i.fa-pencil')).isDisplayed()).toBe(true);
        overheadModal.element(by.css('td button i.fa-pencil')).click();
        overheadModal.element(by.model('overhead.Name')).clear().sendKeys('edited overhead');
        expect(overheadModal.element(by.css('td button i.fa-check')).isDisplayed()).toBe(true);
        overheadModal.element(by.css('td button i.fa-check')).click();

        // delete the markup
        expect(overheadModal.element(by.css('td button i.fa-trash')).isDisplayed()).toBe(true);
        overheadModal.element(by.css('td button i.fa-trash')).click();
        expect(overheadModal.element(by.css('td button i.fa-trash')).isPresent()).toBe(false);

        overheadModal.element(by.buttonText('Done')).click();
    });

    // delete a project
    it('should delete a project', function () {
        // select the project
        element(by.id('left')).element(by.buttonText('TestProject')).click();
        expect(element(by.css('nav ul li a i.fa-trash')).isDisplayed()).toBe(true);
        element(by.css('nav ul li a i.fa-trash')).click();

        // check the confirmation modal
        expect(element(by.id('deleteConfirmation')).isDisplayed()).toBe(true);
        element(by.id('deleteConfirmation')).element(by.buttonText('Delete')).click();

        // check the project has been deleted
        expect(element(by.id('left')).element(by.buttonText('TestProject')).isPresent()).toBe(false);
    });
});
