#Contributing to End-To-End

We'd love for you to contribute to our source code! Here are the guidelines we'd like you to follow:

 - [Question or Problem?](#question)
 - [Issues and Bugs](#issue)
 - [Feature Requests](#feature)
 - [Submission Guidelines](#submit)
 - [Coding Rules](#rules)
 - [Signing the CLA](#cla)

## <a name="question"></a> Got a Question or Problem?

If you have questions about End-To-End, please direct these to the [Google Group][groups]
discussion list.

## <a name="issue"></a> Found an Issue?
If you find a bug in the source code, you can help us by
submitting an issue to our [GitHub Repository][github]. Even better you can submit a Pull Request
with a fix. ***NEVER put your private key*** in a description/comment to the issue. If needed, you can create a throw away key only to ease bug reproduction.

## <a name="feature"></a> Want a Feature?
You can request a new feature by submitting an [issue][issues] to our [GitHub Repository][github].  If you
would like to implement a new feature then consider what kind of change it is:

* **Major Changes** that you wish to contribute to the project should be discussed first on our
[Google Group][groups] so that we can better coordinate our efforts, prevent
duplication of work, and help you to craft the change so that it is successfully accepted into the
project.
* **Small Changes** can be crafted and submitted to the [GitHub Repository][github] as a Pull Request.

## <a name="submit"></a> Submission Guidelines

### Submitting an Issue
Before you submit your issue search the [archive][issues], maybe your question was already answered.

If your issue appears to be a bug, and hasn't been reported, open a new issue.
Help us to maximize the effort we can spend fixing issues and adding new
features, by not reporting duplicate issues.  Providing the following information will increase the
chances of your issue being dealt with quickly:

* **Overview of the Issue** - if an error is being thrown a non-minified stack trace helps
* **Motivation for or Use Case** - explain why this is a bug for you
* **Related Issues** - has a similar issue been reported before?
* **Suggest a Fix** - if you can't fix the bug yourself, perhaps you can point to what might be
  causing the problem (line of code or commit)

### Submitting a Pull Request
Before you submit your pull request consider the following guidelines:

* Search [GitHub](https://github.com/google/end-to-end/pulls) for an open or closed Pull Request
  that relates to your submission. You don't want to duplicate effort.
* **Please sign our [Contributor License Agreement (CLA)](#cla)** before sending pull
  requests. We cannot accept code without this.
* Please be succinct. Create separate pull requests for separate bug fixes/features.
* Make your changes in a new git branch:

     ```shell
     git checkout -b my-fix-branch master
     ```

* Create your patch, **including appropriate [test cases][closure-testing]**.
* Follow our [Coding Rules](#rules).
* Run [linter] to spot and correct any styling errors in the code:

    ```shell
    ./do.sh lint
    ```
  If any fixable errors are present, Closure Linter will display a command that would fix those.

* Run the full test suite. Start the test server:

    ```shell
    ./do.sh testserver
    ```
  Visit [http://localhost:8000/all_tests.html] and ensure all tests pass in your browser.

* Build your changes locally to ensure the build is not broken:

    ```shell
    ./do.sh build_extension
    ./do.sh build_library
    ```

* Push your branch to GitHub:

    ```shell
    git push origin my-fix-branch
    ```

* In GitHub, send a pull request to `google:master`.
* If we suggest changes then
  * Make the required updates.
  * Re-run the test suite, builds and linter to ensure the code is still healthy.
  * Rebase your branch and force push to your GitHub repository (this will update your Pull Request):

    ```shell
    git rebase master -i
    git push -f
    ```

That's it! Thank you for your contribution!

#### After your pull request is merged

After your pull request is merged, you can safely delete your branch and pull the changes
from the main (upstream) repository:

* Delete the remote branch on GitHub either through the GitHub web UI or your local shell as follows:

    ```shell
    git push origin --delete my-fix-branch
    ```

* Check out the master branch:

    ```shell
    git checkout master -f
    ```

* Delete the local branch:

    ```shell
    git branch -D my-fix-branch
    ```

* Update your master with the latest upstream version:

    ```shell
    git pull --ff upstream master
    ```

## <a name="rules"></a> Coding Rules
To ensure consistency throughout the source code, keep these rules in mind as you are working:

* End-To-End is based on [Google Closure][closure] library. Make sure the code you're submitting adheres to Closure principles.
* All features or bug fixes **must be tested** using Closure [unit test][closure-testing] suites.
* We follow ALL the rules contained in
  [Google's JavaScript Style Guide][js-style-guide]
* All public API methods **must be documented**. This includes adding [type annotations](http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml?showone=JavaScript_Types#JavaScript_Types) for input parameters and return values.

## <a name="cla"></a> Signing the CLA

Please sign our Contributor License Agreement (CLA) before sending pull requests. For any code
changes to be accepted, the CLA must be signed. It's a quick process, we promise!

* For individuals we have a [simple click-through form][individual-cla].
* For corporations we'll need you to
  [print, sign and one of scan+email, fax or mail the form][corporate-cla].

[closure]: https://developers.google.com/closure/library/
[closure-testing]: http://docs.closure-library.googlecode.com/git/namespace_goog_testing.html
[corporate-cla]: http://code.google.com/legal/corporate-cla-v1.0.html
[github]: https://github.com/google/end-to-end
[groups]: http://groups.google.com/group/e2e-discuss
[individual-cla]: http://code.google.com/legal/individual-cla-v1.0.html
[issues]: https://github.com/google/end-to-end/issues
[js-style-guide]: http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml
[linter]: https://developers.google.com/closure/utilities/
