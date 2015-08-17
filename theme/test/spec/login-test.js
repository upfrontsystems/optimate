describe('Login page', function() {
    beforeEach(function () {
        browser.get('http://127.0.0.1:8000/#/login');
        browser.driver.findElement(protractor.By.id('userName')).sendKeys('admin');
        browser.driver.findElement(protractor.By.id('userPassword')).sendKeys('admin');
        browser.driver.findElement(protractor.By.id("signinButton")).click();
    });

    it('should be logged in', function() {
        browser.waitForAngular();
        expect(browser.driver.getCurrentUrl()).toBe('http://127.0.0.1:8000/#/projects');
        expect(element(by.css('.project-button')).isPresent()).toBe(true);
    });
});
