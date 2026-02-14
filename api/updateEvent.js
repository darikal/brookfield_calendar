app.put("/api/updateEvent", async (req, res) => {
  const {
    id,
    singleEdit,
    title,
    date,
    startTime,
    endTime,
    eType,
    groupSize,
    contactName,
    contactInfo,
    description,
    recurWhen,
    recurLengthNum
  } = req.body;

  try {
    if (singleEdit) {
      await Event.updateOne(
        { _id: id },
        {
          $set: {
            title,
            date,
            startTime,
            endTime,
            eType,
            groupSize,
            contactName,
            contactInfo,
            description
          }
        }
      );
    } else {
      await Event.updateOne(
        { _id: id },
        {
          $set: {
            title,
            date,
            startTime,
            endTime,
            eType,
            groupSize,
            contactName,
            contactInfo,
            description,
            recurWhen,
            recurLengthNum
          }
        }
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
});
