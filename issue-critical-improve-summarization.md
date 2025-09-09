# Improve summarization

Currently We are parallel sending different sections of the text to be summarized by the model, but that means that the model is losing the context of the whole article. So it would be actually better if we sent the whole article and just gave the model a schema to return in.

And then we just need to implement a little bit of a retry logic such that if the model fails to produce JSON on the first try, that we just retry a second time for reliability. But that's going to improve the summarization of the paragraphs.
