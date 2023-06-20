const express = require('express');
const nodemailer = require('nodemailer');
const Agenda = require('agenda');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: "hotmail",
    host: "smtp-mail.outlook.com",
    auth: {
        user: 'sms.798361@hotmail.com',
        pass: '#Apple1397000'
    },
    tls: {
        ciphers: 'SSLv3'
    }
});

// Configure MongoDB and agenda
const mongoConnectionString = 'mongodb://localhost:27017/mail-Scheduler';
// change collection name to mailScheduler
const agenda = new Agenda({ db: { address: mongoConnectionString } });



// Create a connection to MongoDB and create the collection if it doesn't exist
(async () => {
    const db = await MongoClient.connect(mongoConnectionString, { useUnifiedTopology: true });
    const collectionNames = await db.db().listCollections().toArray();
    const collectionExists = collectionNames.some((collection) => collection.name === 'mailScheduler');

    if (!collectionExists) {
        await db.db().createCollection('mailScheduler');
    }

    agenda.mongo(db.db());
})();

// Define the job to send the scheduled mail
agenda.define('send mail', async (job) => {
    const { to, subject, text } = job.attrs.data;

    const mailOptions = {
        from: 'arunsingh',
        to,
        subject,
        text
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
});

// Create a scheduled email
app.post('/schedule-mail', async (req, res) => {
    const { to, subject, text, scheduledTime } = req.body;

    // Schedule the job
    const job = await agenda.schedule(scheduledTime, 'send mail', { to, subject, text });

    res.json({ message: 'Mail scheduled successfully!', jobId: job.attrs._id.toString() });
});

// Read a scheduled email
app.get('/scheduled-mails/:id', async (req, res) => {
    const { id } = req.params;

    const job = await agenda.jobs({ _id: id });

    console.log(job)

    if (job.length === 0) {
        res.status(404).json({ message: 'Job not found' });
    } else {
        res.json({ job: job });
    }
});

// List all scheduled emails
app.get('/scheduled-mails', async (req, res) => {
    const jobs = await agenda.jobs();

    res.json({ jobs });
});

// Update a scheduled email
app.put('/scheduled-mails/:id', async (req, res) => {
    const { id } = req.params;
    const { scheduledTime } = req.body;

    const job = await agenda.jobs({ _id: id });

    if (job.length === 0) {
        res.status(404).json({ message: 'Job not found' });
    } else {
        await agenda.cancel({ _id: id });

        const updatedJob = await agenda.schedule(scheduledTime, 'send mail', job[0].attrs.data);

        res.json({ message: 'Job rescheduled successfully!', jobId: updatedJob.attrs._id.toString() });
    }
});

// Delete a scheduled email
app.delete('/scheduled-mails/:id', async (req, res) => {
    const { id } = req.params;

    const job = await agenda.jobs({ _id: id });

    if (job.length === 0) {
        res.status(404).json({ message: 'Job not found' });
    } else {
        await agenda.cancel({ _id: id });

        res.json({ message: 'Job deleted successfully!' });
    }
});

// List failed/unsent scheduled emails
app.get('/failed-mails', async (req, res) => {
    const failedJobs = await agenda.jobs({ failed: true });

    res.json({ failedJobs });
});



// Start agenda
(async () => {
    await agenda.start();
})();

const port = process.env.PORT || 4000;

// Start the Express server
app.listen(port, () => {
    console.log('Server is running on port 4000...');
});
