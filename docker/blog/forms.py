from flask_wtf import FlaskForm
from wtforms import StringField, SubmitField, TextAreaField
from wtforms.validators import Length, DataRequired


class PostForm(FlaskForm):
    title = StringField(
        "Title",
        validators=[
            DataRequired(message="Please enter a title."),
            Length(max=120, message="Titles must be 120 characters or fewer."),
        ],
    )
    content = TextAreaField(
        "Content",
        validators=[
            DataRequired(message="Please write some content."),
            Length(max=20000, message="Content must be 20,000 characters or fewer."),
        ],
    )
    submit = SubmitField("Save post")


class DeleteForm(FlaskForm):
    submit = SubmitField("Delete post")
