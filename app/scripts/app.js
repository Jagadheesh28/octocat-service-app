async function renderApp() {
  try {
    let _client = await app.initialized();
    window['client'] = _client;
    _client.events.on('app.activated', renderSidebar);
    return;
  } catch (error) {
    console.error(error);
    await showNotification('danger', 'Unable to load the app');
  }
}

async function showNotification(status, message) {
  const details = {
    type: `${status}`,
    message: `${message}`
  };
  await client.interface.trigger('showNotify', details);
}

function renderSidebar() {
  let createIssBtn = document.querySelector('.create-issue');
  createIssBtn.addEventListener('fwClick', createIssue);

  let viewIssBtn = document.querySelector('.issue-details');
  viewIssBtn.addEventListener('fwClick', async function showDetails() {
    try {
      await client.interface.trigger('showModal', {
        title: 'Github Issue Details',
        template: './views/modal.html'
      });
    } catch (error) {
      console.error('Saw following error:', error);
    }
  });
  async function createIssue() {
    var {
      ticket: { id: ticketID, subject, description }
    } = await client.data.get('ticket');
  
    console.log(ticketID, subject, description)
    try {
      let dbKey = String(ticketID);
      let dbResponse = await client.db.get(dbKey);
      await showNotification('warning', `An github issue is already created for ticket number ${dbResponse.ticketID}`);
    } catch (error) {
      if (!error) return;
      if (error.status && error.message) {
        let { status, message } = error;
        let options = {
          headers: {
            Authorization: 'token <%= access_token %>',
            'user-agent': 'freshworks app'
          },
          body: JSON.stringify({
            title: subject,
            body: description
          }),
          isOAuth: true
        };
        let issuesEnpoint = `https://api.github.com/repos/<%= iparam.github_repo %>/issues`;
        let response = await fetch(issuesEnpoint, options);
        if (!response.ok) {
          throw new Error(`GitHub API Error: ${response.status} - ${response.statusText}`);
        }
        let responseData = await response.json();
        let { id: issueID, number: issueNumber } = responseData;
        let data = {
          ticketID,
          issueID,
          issueNumber
        };
  
        console.log('data', data);
        console.log('status', status);
        console.log('message', message);
        await Promise.all([client.db.set(String(issueID), { ...data }), client.db.set(String(ticketID), { ...data })]);
        await showNotification('success', 'Github Issue has been created successfully');
      } else {
        console.error('Here is what we know:', error);
      }
    }
  }
}