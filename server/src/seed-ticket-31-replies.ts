import "dotenv/config";
import { PrismaClient, SenderType } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const TICKET_ID = 31;

const replies: { senderType: SenderType; body: string }[] = [
  {
    senderType: SenderType.customer,
    body: `Hi there, I wanted to follow up on my original message about the slow dashboard load times.
I've been experiencing this issue consistently for the past week now, and it's really starting to impact my daily workflow.
Every morning when I log in, the dashboard takes anywhere from 25 to 40 seconds to fully render.
I've tried clearing my browser cache and cookies multiple times, but nothing seems to help.
I've also tried different browsers — Chrome, Firefox, and even Edge — and the problem persists across all of them.
My internet connection is definitely not the issue; I'm on a 500 Mbps fibre connection and speed tests show full throughput.
I tested loading other heavy web applications and they all load in under 2 seconds, so it's definitely specific to your platform.
The slowdown seems to have started right around the time of your last deployment on the 12th of April.
Before that date, the dashboard was loading in about 3–4 seconds, which was perfectly acceptable.
I've also noticed that the sidebar navigation feels sluggish — clicking between sections has a noticeable delay.
My team of 8 people are all experiencing the same issue, so it doesn't appear to be isolated to my account.
I've attached a screenshot of the browser's network tab showing the waterfall of requests during a load.
The largest delay appears to be on a request to /api/dashboard/metrics which takes over 18 seconds by itself.
Could you please investigate this on your end and let me know if there's a known issue or a workaround I can use?
I'd really appreciate a quick resolution as this is affecting our team's productivity significantly.
If it would help, I'm happy to jump on a call or provide any additional diagnostics you might need.
Thank you for your help — I look forward to hearing back from you soon.
Best regards,
Sarah`,
  },
  {
    senderType: SenderType.agent,
    body: `Hi Sarah, thank you for reaching out and providing such detailed information about the issue you're experiencing.
I'm sorry to hear that the dashboard performance has been impacting your team's workflow — I completely understand how frustrating that must be.
I've reviewed your account and can confirm that we did push a significant infrastructure update on April 12th, which aligns with when you started noticing the slowdown.
Your observation about the /api/dashboard/metrics endpoint is very helpful — I've flagged this with our engineering team for immediate investigation.
We've been able to reproduce a similar slow response on that endpoint when accounts have a large volume of historical data, which may be a factor here.
While our engineers work on a permanent fix, I have a couple of workarounds that might help in the meantime.
First, you can try adjusting your dashboard date range filter to show only the last 7 days instead of the default 30 days — this reduces the data the metrics endpoint needs to process.
Second, there's a "compact view" option in Dashboard Settings that disables some of the heavier chart components and should noticeably speed things up.
I've also temporarily increased your account's API rate limit priority, which may help with response times during peak hours.
Our engineering team has confirmed this is a known issue affecting accounts with more than 6 months of data and a team size above 5 users — both of which apply to your account.
A hotfix is scheduled to be deployed within the next 24–48 hours that should resolve the metrics endpoint slowness.
I'll personally monitor your account after the deployment and will reach out to confirm the fix is working for you.
In the meantime, please let me know if the workarounds I mentioned provide any relief.
Could you also confirm roughly how many records/transactions your account has? This will help our engineers target the optimisation more precisely.
We genuinely apologise for the disruption this has caused to you and your team.
Your feedback is invaluable and has actually helped us identify a broader issue that was affecting several accounts.
If you have any other questions or concerns in the meantime, please don't hesitate to reply here and I'll get back to you as quickly as possible.
Thanks again for your patience and detailed reporting.
Kind regards,
James (Support Team)`,
  },
  {
    senderType: SenderType.customer,
    body: `Hi James, thank you so much for the quick and detailed response — I really appreciate it.
I tried the workarounds you suggested and the compact view definitely made a difference — it's now loading in about 8–10 seconds instead of 35.
That's still slower than before, but it's much more usable for the time being, so thank you for that tip.
I've set the date range filter to 7 days as well, and combined with compact view, my team can at least get their work done without too much disruption.
Regarding your question about our account data volume: we've been using the platform for about 14 months, and I'd estimate we have around 45,000 transactions and 12,000 user records.
We also have about 800 generated reports saved in our history, which I wonder might also be contributing to the load.
I wanted to mention that we're also experiencing the same slowness on the Reports page — clicking into any report takes about 12 seconds to display.
I'm not sure if this is related to the same underlying issue or something separate, so I wanted to flag it in case it helps the engineers.
One more thing I noticed: the slowdown is noticeably worse between 9am and 11am UTC, which I assume is during your peak traffic hours.
Outside of peak times, the dashboard loads in about 12–15 seconds, which is still slow but more tolerable.
We have a team standup every morning at 9:30am UTC where everyone opens the dashboard simultaneously, so peak load times hit us especially hard.
Is there any possibility of getting a status page update or email notification when the hotfix is deployed?
I'd like to confirm it's resolved before asking my team to switch back to the full view settings.
Also, do you have any estimate on whether the performance will return to the pre-April-12th levels after the fix?
If there's anything else I can do to assist the engineers, such as running specific tests or providing more data, please just ask.
Thanks again for being so responsive and for escalating this promptly.
Looking forward to the fix.
Best,
Sarah`,
  },
  {
    senderType: SenderType.agent,
    body: `Hi Sarah, thank you for the additional context — the data volume figures are very useful for our engineering team.
I've passed on the 45,000 transactions and 800 saved reports detail, and the engineers have confirmed this is above the current optimisation threshold.
The Reports page slowness you mentioned is indeed related to the same root cause — the metrics aggregation pipeline is underperforming for high-volume accounts.
So the hotfix scheduled for the next 24–48 hours should address both the dashboard and the reports page simultaneously.
I also want to acknowledge your observation about peak hours — between 9am and 11am UTC is indeed our highest traffic window globally.
We're actually spinning up additional capacity for that window as part of the hotfix rollout to help with concurrency issues.
I've added your account to our monitoring dashboard so I can personally track your load times before and after the deployment.
Regarding your question about returning to pre-April-12th performance levels: yes, the goal of the fix is to fully restore the sub-5-second load times you had before.
In fact, the engineers are optimistic the fix will actually improve on that baseline, since they've identified a query that was always inefficient but only became critically slow above a certain data threshold.
I've set up an automatic notification to be sent to your registered email address the moment the hotfix is deployed to production.
You should also see a banner in the dashboard interface confirming the update once it's live.
Once you receive that notification, I'd recommend clearing your browser cache one more time before testing, just to ensure you're getting fresh data.
I'd also suggest waiting until off-peak hours (after 3pm UTC) to run your initial post-fix test, so the results aren't skewed by concurrent traffic.
Please do let me know how it performs after the fix — your feedback loop is really important to us.
If the performance doesn't improve significantly, I'll escalate to a senior engineer for a dedicated investigation of your account specifically.
I also want to apologise again for the impact on your morning standups — I know how important that routine is for team coordination.
Is there anything else I can clarify or assist with while we await the fix?
Thank you for your continued patience and cooperation, Sarah.
Warm regards,
James`,
  },
  {
    senderType: SenderType.customer,
    body: `Hi James, just checking in as it's been about 48 hours since your last message.
I haven't received the deployment notification yet, and the performance is still the same as before.
I wanted to make sure this hasn't slipped through the cracks, especially since you mentioned it would be deployed within 24–48 hours.
To update you on the current situation: the dashboard is still taking 30+ seconds to load in normal view.
In compact view with 7-day range it's around 8–10 seconds, which is workable but not ideal for all use cases.
This morning's standup was particularly rough — we had a client demo that required showing the full dashboard and it was very embarrassing.
The client noticed the slow loading and asked if it was a system issue, which put us in an awkward position.
I want to stress that for our team, the dashboard is mission-critical — we monitor KPIs in real time and rely on it being fast and responsive.
If the fix is going to take longer than initially estimated, please do let me know so I can set appropriate expectations with my team and manager.
I'd also appreciate knowing what the revised timeline looks like and what caused the delay if there was one.
In terms of new developments: I noticed that exporting a report to CSV now also times out for date ranges over 14 days, which wasn't happening before.
This is an additional regression that's affecting our weekly reporting process.
I'm also seeing occasional 504 Gateway Timeout errors on the /api/reports/export endpoint, roughly 1 in every 3 attempts.
I've documented these with timestamps if it would help the engineers.
Apologies if this message comes across as impatient — I know you're working on it and I genuinely appreciate the effort.
I just want to keep you informed of the full scope of impact so the fix is as comprehensive as possible.
Please let me know the updated status at your earliest convenience.
Thank you,
Sarah`,
  },
  {
    senderType: SenderType.agent,
    body: `Hi Sarah, please accept my sincere apologies for missing the promised 48-hour deadline — I completely understand your frustration.
The hotfix deployment was delayed by an unexpected issue in our staging environment that required additional testing before pushing to production.
I should have proactively communicated this delay rather than leaving you waiting, and I apologise for that oversight.
The good news is that the fix has now passed all staging tests and is scheduled to deploy to production today at 14:00 UTC — in approximately 4 hours from now.
I've escalated this ticket to our Senior Infrastructure Engineer, Marcus, who has personally reviewed your account and the specific performance bottlenecks.
The CSV export timeout issue you've flagged is a new regression that our QA team missed — thank you for catching it, and it will be included in today's deployment.
The 504 errors on /api/reports/export are caused by the same underlying query timeout, so they should also be resolved by the fix.
I'm genuinely sorry about the client demo situation — that's exactly the kind of high-stakes moment where reliability matters most, and we let you down.
As a goodwill gesture for the disruption caused, I've applied a 20% discount to your next billing cycle, which you'll see reflected on your next invoice.
I've also escalated a request to our account team to proactively reach out to you about a dedicated performance SLA for accounts of your size.
After today's deployment, Marcus will personally review your account metrics over the following 48 hours to ensure everything is performing as expected.
I'll send you a personal update message as soon as the deployment completes and I've verified your account's load times have improved.
If you experience the 504 errors again after the fix, please reply immediately and I'll treat it as a P1 incident.
Regarding your timestamped logs — yes, please do send them over if you can. They'll be invaluable for our post-incident review.
We take performance regressions very seriously, and your detailed reporting has genuinely helped us identify the full scope of this issue.
Once this is fully resolved, I'd like to schedule a brief call to walk through some optimisation settings that could improve performance for large accounts like yours.
Thank you for your patience and for continuing to engage constructively despite the disruption.
I'll be back in touch by 16:00 UTC today with a status update.
Kind regards,
James`,
  },
  {
    senderType: SenderType.customer,
    body: `Hi James, thank you for the update and for the explanation about the staging delay.
I appreciate the transparency and the goodwill discount — that's a genuinely kind gesture and I've passed the information on to our finance team.
I'll look out for the 14:00 UTC deployment and will test the dashboard afterwards as you suggested.
I've attached the timestamped log file with the 504 errors as requested — you should see it attached to this message.
The log covers the past 5 days and shows 47 timeout errors in total, mostly clustered during our 9–11am peak window.
I also wanted to flag one more thing I noticed today: the search functionality on the Reports page seems to be affected too.
Searching for a specific report by name now returns results very slowly — about 15 seconds — whereas before it was near-instant.
I'm not sure if this is the same issue or a separate one, but I wanted to make sure Marcus is aware.
My team has been managing with the compact view workaround but it's limited — some of our data visualisations aren't available in compact mode.
In particular, the real-time trend chart isn't shown in compact view, and that's one of the most important tools for our morning KPI reviews.
Could you ask if it's possible to enable the trend chart in compact view as an interim measure, even if it's slower?
That would significantly reduce the impact on our team while we wait for the full fix.
I want to reiterate that despite this difficult week, the support team's responsiveness (once engaged) has been excellent.
The fact that Marcus is personally reviewing our account gives me confidence that this will be resolved properly.
I'll test thoroughly after the 14:00 UTC deployment and report back with results.
If the fix is successful, I'd absolutely be open to the optimisation call you mentioned — I think that would be very valuable.
Talk soon,
Sarah`,
  },
  {
    senderType: SenderType.agent,
    body: `Hi Sarah, the deployment completed successfully at 14:17 UTC today — slightly behind schedule but with no issues.
I've been monitoring your account for the past hour and I'm pleased to report that the /api/dashboard/metrics endpoint is now responding in 1.2 seconds on average.
The CSV export and /api/reports/export endpoints are also performing normally — no timeouts in the past 60 minutes of monitoring.
Marcus specifically reviewed your account's query patterns and implemented an additional index on the transactions table that should give you an extra 30–40% speed improvement on top of the general fix.
Before you test, please make sure to clear your browser cache with a hard refresh (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac) to ensure you're not seeing cached data.
Then try loading the full dashboard in normal view (not compact) with your default date range and let me know the load time.
Regarding your question about enabling the trend chart in compact view: I've submitted that as a feature request to our product team.
They've confirmed it's technically feasible and have added it to the next sprint, so you should see it available in the next 2–3 weeks.
I've also received your log file — thank you. I've passed it to Marcus for inclusion in the post-incident review.
The 47 timeout errors you documented are all accounted for by the query bottleneck that's now fixed, so you shouldn't see any recurrence.
In terms of the search functionality on the Reports page: that was indeed a separate issue caused by a missing cache layer that was accidentally removed in the April 12th deployment.
The cache layer has been restored in today's fix, so report search should also be back to near-instant performance.
Please do test all the affected areas and give me your feedback when you get a chance.
I'm keeping this ticket open until I hear from you that everything is working to your satisfaction.
Once again, I apologise for the disruption this week — it should not have taken this long to resolve, and we'll be reviewing our deployment and monitoring processes as a result.
Looking forward to hearing good news from you after your testing.
Best,
James`,
  },
  {
    senderType: SenderType.customer,
    body: `Hi James, I've just finished testing and I'm very happy to report that the performance is dramatically improved.
The full dashboard in normal view loaded in 2.1 seconds — I ran the test five times and it was consistently between 1.8 and 2.4 seconds.
That's actually faster than it was before the April 12th incident, so it seems the additional optimisation Marcus applied has made a real difference.
The Reports page is also loading quickly — individual reports are opening in under 2 seconds, and the search is back to being near-instant.
I tested the CSV export with a 90-day range and it completed successfully in about 4 seconds, which is excellent.
The real-time trend chart is working beautifully in full view, and my team is very relieved to have it back.
I've turned off compact view and switched back to the default 30-day date range — everything is performing well.
I also ran a concurrent test during our afternoon team session (8 people logged in simultaneously at 15:30 UTC) and there was no degradation at all.
I'm really impressed by how comprehensively this has been resolved — it's clear that Marcus did a thorough job on the optimisation.
I want to pass on my team's appreciation as well — they were understandably frustrated during the incident but are relieved and satisfied now.
The goodwill discount is appreciated and I'll make sure our finance team applies it correctly at renewal.
I would still love to take you up on the optimisation call — even with these improvements, I'm sure there are further tweaks that could benefit a high-volume account like ours.
Could you set that up for sometime next week? Any time after 10am UTC works for me.
I'll also pass on the positive feedback about your personal handling of this ticket — you were communicative and thorough even when the news wasn't good.
One final thing: will there be a post-incident summary published? I'd like to share it with my management team to close out the internal incident report.
Thank you, James, and please thank Marcus from me as well.
Best wishes,
Sarah`,
  },
  {
    senderType: SenderType.agent,
    body: `Hi Sarah, this is absolutely wonderful news — I'm so pleased to hear the performance has exceeded pre-incident levels!
A consistent 1.8–2.4 second load time is excellent for an account of your data volume, and it's a real testament to Marcus's work on the query optimisation.
The successful concurrent load test with 8 simultaneous users during the afternoon is particularly encouraging — that's exactly the scenario we were most focused on improving for you.
I've updated our monitoring alerts to flag immediately if your account's dashboard load time exceeds 5 seconds at any point, so we'll catch any regression well before it impacts your team.
Regarding the optimisation call: I'll set that up for next week. How does Tuesday April 28th at 10:30am UTC sound?
Marcus would like to join the call as well, if that's alright with you, as he has some specific recommendations about index strategies that could further improve your report generation times.
A formal post-incident summary will be published to our status page within the next 48 hours — I'll send you the direct link as soon as it's live.
The summary will cover the root cause, the timeline of events, the fix applied, and the process improvements we're implementing to prevent recurrence.
I'll also prepare a personalised version for your management team that includes your account-specific metrics before and after the fix — just let me know if that would be useful.
I've made a note to follow up with you in 7 days to check that performance has remained stable, especially through a full Monday morning peak period.
Your kind words about the support experience mean a lot to me and the team — handling incidents like this is difficult and feedback like yours genuinely motivates us to do better.
I've passed your thanks on to Marcus, who was glad to be able to make such a significant improvement.
I'm closing this ticket as resolved for now, but please don't hesitate to reopen it or start a new one if anything comes up.
The account team will be in touch this week to discuss the performance SLA options I mentioned earlier.
Thank you again for your patience, your detailed reporting, and your constructive engagement throughout — you made it much easier for us to identify and fix the root cause.
Warm regards,
James`,
  },
  {
    senderType: SenderType.customer,
    body: `Hi James, Tuesday April 28th at 10:30am UTC works perfectly for me — please do include Marcus, I'd love to thank him directly.
I've noted the call in my calendar and will send you a meeting invite shortly so we have it locked in on both sides.
Could you confirm which video conferencing platform you prefer — we use Google Meet primarily but are happy to use Zoom or Teams if that works better for you?
I also wanted to follow up on something I noticed this morning during our standup — everything was fast and smooth, which was a welcome relief.
However, I did notice one minor thing: the "Last updated" timestamp on the dashboard header seems to be showing a time about 3 minutes in the future.
It's a very minor issue and certainly not urgent, but I thought it was worth mentioning in case it indicates a clock sync issue on one of your servers.
The standup itself went perfectly — the trend chart was crisp, data was updating in real time, and the team was visibly happier.
Our client was actually on a call with us this morning (the same client from the difficult demo last week) and commented on how snappy the interface was.
So the reputational situation has turned around nicely, which is a big relief.
I've started on our internal incident report and I'll include the status page post-mortem link once you send it over.
My manager has asked me to write up the support experience as well, and I'll be highlighting the quality of communication and the thoroughness of the fix.
I've also recommended your platform to a colleague at another company who was asking about our toolstack — I hope that comes to something for you.
One more request: is there a way to get a history of all performance-related changes to our account? Our compliance team likes to maintain an audit trail.
Thank you again for everything, James — this has been a model example of how a support incident should be handled in the end.
Looking forward to the call next week.
Best,
Sarah`,
  },
  {
    senderType: SenderType.agent,
    body: `Hi Sarah, thank you for confirming — the calendar invite has been sent to your registered email address and I've blocked the time for myself and Marcus.
Google Meet works perfectly for us — I've included the Meet link in the calendar invitation so there's nothing extra to set up.
Marcus wanted me to pass on that he's genuinely looking forward to the call and has already prepared some personalised recommendations based on your account's usage patterns.
Regarding the timestamp showing 3 minutes in the future: thank you for flagging that — you're absolutely right that it points to a minor NTP drift on one of our edge nodes.
I've raised it with our infrastructure team and they've identified the affected node. It's being patched in tonight's maintenance window and should be corrected by tomorrow morning.
It won't affect your data or performance, but it's good housekeeping to fix it, so thank you for the sharp eye.
I'm delighted to hear the standup went smoothly and that the client demo turnaround was so positive — that really is the best possible outcome.
Regarding your request for an account-level performance history: yes, this is available through your account's Audit Log in the Settings section.
You can filter by "Infrastructure Events" to see all performance-related changes, including our recent fix. I'll walk you through this in more detail during Tuesday's call.
If your compliance team needs a formal export, our enterprise export feature can generate a signed PDF of the audit trail — I'll demonstrate this on Tuesday as well.
I'll send over the post-incident report link the moment it's published, likely tomorrow or Wednesday.
Your positive recommendation to your colleague is incredibly kind and very much appreciated — I've made sure to flag it with our account team.
Please do let me know if your compliance team needs anything specific before Tuesday's call, and I'll prepare it in advance.
The timestamp fix will be silent — no notification needed — but I'll confirm it's resolved in our meeting on Tuesday.
I'm really glad this experience has ended on such a high note, and I look forward to our conversation next week.
Have a great rest of your week, Sarah.
Warm regards,
James`,
  },
  {
    senderType: SenderType.customer,
    body: `Hi James, the calendar invite looks great — everything is confirmed and the Meet link works perfectly.
Quick note: I just saw the post-incident summary appear on your status page and have shared the link with my management team — it's very well written and comprehensive.
Management was impressed by the transparency and the detail on the process improvements you're implementing, so thank you for that.
I also noticed this morning that the timestamp issue has been corrected — the "Last updated" is showing the right time now, so that's been fixed promptly.
Everything on the dashboard continues to perform excellently — three days in now and not a single hiccup.
I ran a larger data export this morning, a 6-month range with all transaction categories, and it completed in 7 seconds. Previously this would have timed out entirely.
My team is now comfortably back to using all features in full view mode and the productivity impact has been completely reversed.
I wanted to use this message to also ask about a feature request unrelated to the performance issue: is there a way to schedule automated report exports?
We currently manually export our weekly KPI report every Friday afternoon, and it would be great if this could run automatically and be emailed to a distribution list.
If this feature doesn't exist, is there a way to request it through the product roadmap process?
Also, one of my colleagues noticed that the mobile app seems slightly slower than the web dashboard for the same operations — is the same optimisation being applied to the mobile backend?
I don't want to overload you with requests, so please prioritise the Tuesday call items and we can cover these questions there if preferred.
Looking forward to Tuesday — I've prepared a list of questions for Marcus about further optimisation strategies.
Thanks again, James.
Best,
Sarah`,
  },
  {
    senderType: SenderType.agent,
    body: `Hi Sarah, wonderful to hear the post-incident report landed well with management — our communications team worked hard on it so I'll pass that feedback along.
It's great to hear the timestamp fix was picked up so quickly — our infrastructure team takes pride in overnight turnarounds on low-severity issues like that.
A 6-month full-category export completing in 7 seconds is a genuinely impressive result — that query was timing out for you even at 14 days before the fix, so it's a massive improvement.
Regarding scheduled report exports: this feature does exist in our Pro and Enterprise plans, but I see from your account that you're currently on the Growth plan.
You can schedule up to 5 automated report exports on Pro, or unlimited on Enterprise. The setup is in Reports > Schedule, though you may not see the menu item on Growth.
I'd recommend discussing this during Tuesday's call — given your usage patterns, an upgrade to Pro might unlock several features that would benefit your team, and we can walk through the cost-benefit.
Regarding the mobile app performance: the backend optimisations do apply to all clients including mobile, but the mobile app has an additional local caching layer that may not have been invalidated yet.
Please ask your colleague to force-quit the app completely and reopen it — this will clear the local cache and they should see the improved performance immediately.
If the mobile app is still slow after that, please let me know and I'll raise a separate ticket for our mobile team to investigate.
I've added both the scheduled exports question and the mobile performance query to the agenda for Tuesday's call.
Marcus has specifically prepared a section on query optimisation strategies for large account datasets that I think you'll find very useful.
I've also prepared a side-by-side before/after performance comparison for your account that we'll walk through.
Is there anything else you'd like me to add to the Tuesday agenda in advance?
Looking forward to a productive call.
Best,
James`,
  },
  {
    senderType: SenderType.customer,
    body: `Hi James, the mobile app tip worked — my colleague force-quit and reopened the app and it's now as fast as the web dashboard. Thank you for that.
I've passed the information about scheduled exports and the Pro plan upgrade along to my manager for consideration ahead of Tuesday's call.
She's keen to understand the pricing difference and whether there are other features in Pro that would benefit our team, so it would be good to have a brief overview ready.
I've also put together my list of questions for Tuesday, which I'll share now so Marcus has time to prepare if needed.
First, are there any index strategies beyond what's already been applied that could further reduce our report generation times?
Second, is there an optimal number of saved reports we should maintain to keep performance healthy, or is the storage of historical reports not a performance factor?
Third, we're planning to onboard 5 additional team members in May — will this affect performance, and should we consider upgrading our plan at that point?
Fourth, are there any caching strategies on the client side (browser or local storage) that we could configure to improve perceived performance?
Fifth, does the platform support read replicas for large accounts, and is that something we could benefit from?
I realise these are quite technical questions — please feel free to let Marcus know in advance and he can decide how much detail to go into on the call.
I'm genuinely excited about the call and feel like we've moved from a difficult support incident to a really collaborative relationship, which is a great outcome.
My manager also asked me to pass on her thanks to Marcus and the engineering team for the personal attention given to our account.
See you Tuesday at 10:30am UTC — I'll have a coffee ready.
Best,
Sarah`,
  },
  {
    senderType: SenderType.agent,
    body: `Hi Sarah, those are excellent questions and I've forwarded them to Marcus — he was very pleased to receive them in advance as it lets him prepare specific, data-driven answers for your account.
I can give you a brief preview on a couple of points: regarding the optimal number of saved reports, Marcus's analysis suggests that above 1,000 saved reports you start to see marginal performance costs, and at 800 you're within a comfortable range.
On the question of read replicas: yes, the platform does support this for Enterprise accounts, so if you upgrade to Pro and find you need further scaling, that would be the natural next step.
For the 5 new team members in May: this shouldn't significantly impact performance on its own, but if you're adding them alongside an increase in data volume, it's worth revisiting your plan at that point.
Marcus will have precise figures for all of this based on your specific account growth trajectory, so Tuesday's call will be much richer than anything I can provide in text.
Regarding the Pro plan pricing: I've prepared a comparison document that shows Growth vs Pro feature sets and pricing for your current seat count. I'll share it on Tuesday's call rather than by email to ensure I can answer any questions in context.
Your manager's thanks to Marcus and the team has been passed on — Marcus actually mentioned to me this morning that this ticket has been one of the most professionally engaged support cases he's worked on, which I think is a real testament to how you've handled a difficult situation.
I've confirmed the Tuesday 10:30am UTC call in my calendar and set a reminder for 15 minutes before to ensure I'm ready.
In the meantime, please enjoy the improved performance and have a restful weekend.
I'll see you Tuesday — I'll have a coffee ready too.
Warm regards,
James`,
  },
  {
    senderType: SenderType.customer,
    body: `Hi James, just a brief note before our call tomorrow to say that performance has continued to be excellent all week.
Monday morning standup this week was completely smooth — 8 users on simultaneously during peak hours and sub-2-second load times across the board.
I also ran a stress test of sorts on Friday: I opened the full dashboard, generated three reports simultaneously, and ran a CSV export — all at the same time — and there were no issues whatsoever.
This is a level of reliability we've never experienced before with this platform, so the Marcus optimisation has genuinely moved the needle.
I also wanted to flag one small UX thing I noticed: when a report is loading, the spinner appears in the bottom-left corner, which is easy to miss.
It might be worth discussing with your product team whether a more prominent loading indicator would be beneficial — not urgent at all, just a thought.
I'm looking forward to tomorrow's call and have my questions list ready.
My manager will be joining for the first 15 minutes to say thank you in person and to discuss the Pro plan options, and then she'll drop off and Marcus and I can get into the technical details.
Could you send the Meeting link again? I want to share it with my manager separately as she wasn't on the original invite.
I'm also going to write a G2 review for your platform this week — I think it's important to share the full story, including the incident and the excellent recovery, as that's more valuable than just a five-star without context.
See you at 10:30am UTC tomorrow.
Best,
Sarah`,
  },
  {
    senderType: SenderType.agent,
    body: `Hi Sarah, the Meet link for tomorrow's call is in the calendar invitation but I'll also include it here for easy sharing: the link is in the invite I sent to your registered address — please forward the whole calendar invitation to your manager and she'll have the link and all the details.
That's wonderful to hear about Monday's standup — 8 concurrent users at peak with sub-2-second load times is exactly the outcome we were aiming for.
Your stress test results are genuinely impressive and I've shared them with Marcus, who is very pleased.
The UX feedback about the loading spinner location is a great observation — I've submitted it as a product feedback item tagged as a low-priority improvement, with your account noted as the source.
Our product team does read these submissions and it may well appear in a future release.
I'm looking forward to meeting your manager tomorrow, even briefly — please let her know she's very welcome and we'll keep the first 15 minutes appropriately high-level.
Marcus has prepared a polished summary of the optimisation work for that portion of the call, which should give her a clear picture of what was done and why it matters.
We're both excited about the technical deep-dive portion — Marcus has a few things to show you in the admin console that I think will genuinely surprise you in a good way.
A G2 review would mean a great deal to us, and I think your perspective — acknowledging the incident honestly while highlighting the recovery — is exactly the kind of nuanced feedback that helps other customers make informed decisions.
There's no obligation at all, but if you do write one, I genuinely believe it will be one of the more useful reviews on the platform.
I'll be at my desk from 10:15am UTC tomorrow, coffee in hand.
See you at 10:30am — looking forward to it.
Warm regards,
James`,
  },
  {
    senderType: SenderType.customer,
    body: `Hi James and Marcus, thank you both for such an excellent call this morning.
That was easily the most productive technical conversation I've had with a vendor support team in years, and my manager echoed that sentiment before she dropped off.
Marcus's walkthrough of the index strategy was fascinating — I had no idea how much impact the composite index on the transactions table would have, and the before/after query execution plan comparison was very illuminating.
The client-side caching recommendations are already implemented — my developer colleague made the changes during the call, which I thought was a great sign of how actionable the advice was.
We've decided to proceed with the Pro plan upgrade, which we'll formalise through your account team this week.
The scheduled report export feature alone is worth the upgrade cost — it'll save our team about 2 hours per week in manual work.
Marcus's point about the read replica option being available if we exceed 100,000 transactions is noted and we'll revisit at that point.
I've posted my G2 review this afternoon — I went with a 4.5 star rating with a detailed narrative covering the incident and the recovery.
I thought that was more honest and ultimately more credible than a straight 5-star without context.
My manager also plans to write a separate review from the management perspective.
I've added James and Marcus to our internal "outstanding vendors" list, which means they're flagged for automatic renewal consideration — a small but meaningful internal recognition.
Is there a formal feedback channel I can use to commend James by name to his manager?
I want to make sure the quality of support he provided is on record, because it genuinely made the difference between us considering switching platforms and renewing enthusiastically.
Thank you again, both of you, for turning what started as a very frustrating incident into such a positive experience.
Best wishes,
Sarah`,
  },
  {
    senderType: SenderType.agent,
    body: `Hi Sarah, Marcus and I are both genuinely touched by your kind words — thank you for taking the time to write such a thoughtful follow-up.
Your G2 review has already been seen by our marketing team, who flagged it as one of the most balanced and credible reviews we've received this year — the honest framing of the incident and the recovery is indeed more powerful than a simple five-star.
Please do also pass on our thanks to your manager for her kind words on the call and for her commitment to writing a review of her own.
Regarding formally commending James: you can submit feedback through our "Share a Compliment" form at the link in the footer of our support portal, or you can email our Support Manager directly — I'll have the address sent to your registered email shortly.
James's handling of this ticket will also be included in his next quarterly review as a positive example, which he's very pleased about.
The Pro plan upgrade is being processed by our account team and you should receive the confirmation and updated invoice within 24–48 business hours.
Once activated, the scheduled report export feature will appear immediately in your Reports dashboard.
Marcus wanted me to add that he's available for a brief follow-up technical call in about 30 days if you want to review how the optimisations are holding up as your data continues to grow.
He's also preparing a written version of the index recommendations he walked through today, which we'll send over by end of week as a reference document.
We'll keep this ticket open for another 7 days to capture any final follow-ups, and then close it as fully resolved with a comprehensive resolution note.
Thank you again, Sarah — this has been an exceptional support engagement and a reminder of why we do this work.
With warm regards,
James and Marcus`,
  },
];

const agent = await prisma.user.findFirst({ where: { role: "agent", deletedAt: null } });

if (!agent) {
  console.error("No active agent user found. Please seed users first.");
  await prisma.$disconnect();
  process.exit(1);
}

const ticket = await prisma.ticket.findUnique({ where: { id: TICKET_ID } });
if (!ticket) {
  console.error(`Ticket ${TICKET_ID} not found.`);
  await prisma.$disconnect();
  process.exit(1);
}

let createdAt = new Date(ticket.createdAt);
for (const reply of replies) {
  createdAt = new Date(createdAt.getTime() + 2 * 60 * 60 * 1000);
  await prisma.reply.create({
    data: {
      ticketId: TICKET_ID,
      senderType: reply.senderType,
      authorId: reply.senderType === SenderType.agent ? agent.id : null,
      body: reply.body,
      createdAt,
    },
  });
}

console.log(`Inserted ${replies.length} replies on ticket ${TICKET_ID}.`);
await prisma.$disconnect();
