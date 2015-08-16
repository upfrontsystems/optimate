// run test on the projects page
describe('Projects Page', function () {

    // login before each test
    beforeEach(function () {
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
        expect(element(by.id('left')).element(by.buttonText('TestProject')).isPresent()).toBeTruthy();
    });
});
