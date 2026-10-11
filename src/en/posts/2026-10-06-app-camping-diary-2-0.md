---
title: "Camping Diary App 2.0: Our Logbook Gets a Makeover"
excerpt: "New navigation, an on-the-road mode with weather warnings, a season planner with school holidays and blog posts that appear in English straight away. What has changed in our app since the summer."
source_hash: "7f27b703f48cd2cf"
translation_hash: "88b97baddc9058b8"
---

In August we introduced our own camping app here, the private logbook we use to plan and record our trips. We have been out and about a lot since then, and every trip brought a new idea: what was missing, what was fiddly, what we would have liked to see at a glance. After a few smaller updates we have now rebuilt the app from the ground up. Time for version 2.0.

Update of 11 October 2026: there is now another update with a season planner, school holidays and a laptop view. More on that further down.

The screenshots in this post show sample data. Our real trips, costs and mileage stay private.

## New name and new navigation

The "Camping-Logbuch" has become the "Camping Diary". The biggest change is visible as soon as you open it, though: instead of a home screen full of tiles there is now a fixed navigation bar at the bottom with five sections, namely Overview, Trips, Vehicle, Finances and Review. We jump straight between them without going back to the home screen. The active section has a dark green background, so you always know where you are.

The new overview shows what really matters day to day: the next or current trip with a direct link, a reminder when the booking window opens within the next 14 days for a campsite on our wish list, and the open items on the shopping list and to-dos. There are also buttons for quickly logging fuel, charging, mileage and expenses, plus two tiles showing where we stand on the mileage budget and finances.

![The app's overview and trip list](/images/cali-diaries-2-0-uebersicht-trips.jpg)

## All trips in one place

Trip planning and trip reports used to be separate sections. Now everything sits in one list: current, planned and completed trips. Planned trips show a date and how many days are left, completed ones their rating and the most important tags. Trips that are over but still have no report are collected under "Noch ohne Bericht" (no report yet), so none of them gets forgotten.

A switcher toggles between list, calendar, wish list and map. We can export the calendar as a file and add it to our regular calendar.

There is also a new filter. It lets us search by name or place, minimum rating, year and tags. If you only want to see child-friendly campsites rated 4 or higher, for example, they are in front of you in two clicks. That comes in handy right now during the winter break, while we plan the next season.

## On-the-road mode

The on-the-road mode is the part we enjoy most. As soon as a trip is under way, the app shows which day we are on at the top, for example "Tag 2 von 3" (day 2 of 3). Below that is what is on the menu today, and at the bottom there is a bar with two buttons: one to jot down a lesson on the spot when something occurs to us, and one to close the trip at the end and rate it straight away.

The app also warns us when the weather turns unpleasant. That covers cold nights of 10 degrees or less, rain with a probability of 50 percent or more and strong wind from 40 km/h. It names the most critical day, and during a trip it looks at today.

![On-the-road mode with weather warning and lists](/images/cali-diaries-2-0-unterwegs.jpg)

Shopping list, packing list, to-dos and meal plan are now arranged as small tabs with counters inside the trip. Completed items are crossed out and folded away, so only what is still open stays visible.

## Vehicle, finances and review

In the vehicle section we see the current mileage at the top and how much of our lease's mileage budget has already been used. Below that we can switch between upcoming tasks, the service and repair history and the odometer readings. For planned purchases the app adds up the costs, and links to shops now appear as a short name only.

![Trip filter and vehicle section](/images/cali-diaries-2-0-filter-fahrzeug.jpg)

Finances now have their own section. At the top is the total, split into California and camping, next to the fixed costs per month and what a night of camping costs us on average. Recurring items such as the lease payment show how many instalments have already been paid.

The review section brings together the lessons learnt, the map of every pitch we have stayed at so far and the statistics: number of trips and nights, the average rating, the kilometres driven and the costs by category.

![Finances and review](/images/cali-diaries-2-0-finanzen-rueckblick.jpg)

## From report straight to the blog

Part of the app is closely linked to this blog. At the push of a button, the app turns a trip report and our notes into a draft blog post. We read it through, adjust it and upload it directly. The blog has recently become available in English too, and the app translates every post as it uploads it. It never overwrites English texts we have improved by hand.

## Update: season planner, holidays and laptop view

The post had barely gone live when the next round of work began. The new update is mostly about planning the next season, which is exactly what keeps us busy during the winter break.

Under Trips there is now a "Season" view next to list and calendar. It shows a timeline for every month with all trips and a band for the school holidays. When we tap a place from the wish list, the app highlights every free gap that is long enough. For this, each wish now has a minimum number of nights. Green means quiet, yellow means busy. Tapping a gap lets us pick the arrival day and adjust the nights. Hints point out overlaps, public holidays, school holidays, the booking window and the driving distance.

![Season planner with wish list and planning sheet](/images/cali-diaries-2-0-saisonplaner.jpg)

Trips now have a status: idea, requested or confirmed. Anything not yet confirmed is shown dashed and never becomes the current trip. The booking window from the wish list carries over, so the reminder on the overview covers planned trips too. And trips can no longer overlap; occupied days cannot be picked in the first place.

School and public holidays come from the OpenHolidays API, for Switzerland, Germany and Austria by default. In the calendar, tapping a day shows how busy it is.

![Trips with status and calendar with holiday hint](/images/cali-diaries-2-0-status-ferien.jpg)

On the laptop the app now uses the full width. Navigation moves to a sidebar, and list and detail sit side by side. For planning the season in the evening, that is much more comfortable than on the phone.

![The app on a laptop with list and trip side by side](/images/cali-diaries-2-0-laptop.jpg)

The vehicle section now shows the Cali's dimensions and weights below the mileage: length, width, height, kerb weight and payload. Handy before an underground car park or when a campsite asks for the vehicle length. And for anyone installing the app themselves, the first start brings a short setup and an introduction, in German or English.

![Vehicle dimensions and introduction on first start](/images/cali-diaries-2-0-fahrzeug-einfuehrung.jpg)

## Built with Claude, ready to self-host

The app was not built by a development team. I vibe coded it together with Claude: I describe what the app should do, Claude writes the code, and I test the result straight away on the iPhone. Every version came about this way, from the first list of campsites to where it stands today.

If you would like to use the app yourself, it is now available on GitHub: [cali-diaries-app-public](https://github.com/homeautoak-svg/cali-diaries-app-public). It runs, for example, as a Docker container on your own server or NAS, so your data stays with you.

## Lots of small things

Plenty of other things have become more polished. A splash screen appears as soon as the app opens, followed by placeholders until the data has loaded. If our server at home cannot be reached after a few seconds, a note appears with a button to try again. Amounts are shown consistently in Swiss format, text has more contrast and buttons are big enough for a thumb. On the iPhone the navigation bar now reliably stays at the bottom, even while scrolling or when the keyboard appears and disappears.

While the Cali takes its winter break, we mainly use the app to plan the next season. And of course we keep collecting ideas for the next version along the way.
