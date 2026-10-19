// The owner's Stories tool in Admin: add and change a story, make a post a chapter, take a chapter out, delete a story, and what it says when something goes wrong.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const h = vi.hoisted(() => ({ stories: [], rows: [], posts: [], owner: true, calls: [], failSave: false }))
vi.mock('../src/stories/storiesApi', () => ({
  fetchStories: vi.fn(async () => h.stories), fetchChapterRows: vi.fn(async () => h.rows), fetchChapterPosts: vi.fn(async () => h.posts),
  saveStory: vi.fn(async (id, value) => { if (h.failSave) throw new Error('Only the site owner can change the stories.'); h.calls.push(['saveStory', id, value]) }),
  removeStory: vi.fn(async (id) => { h.calls.push(['removeStory', id]) }),
  saveChapter: vi.fn(async (value) => { if (h.failSave) throw new Error('That post is already a chapter of a story. Remove it from there first.'); h.calls.push(['saveChapter', value]) }),
  removeChapter: vi.fn(async (storyId, number) => { h.calls.push(['removeChapter', storyId, number]) }),
}))
vi.mock('../src/admin/useIsOwner', () => ({ useOwnerCheck: () => ({ checking: false, owner: h.owner }) }))
import AdminStories from '../src/admin/AdminStories'

const STORY_ID = '11111111-2222-4333-8444-555555555555'
const POST_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const story = { id: STORY_ID, slug: 'the-lantern', title: 'The Lantern', teaser: 'A light.', picture_url: 'https://img.example.com/a.jpg', status: 'running', finished_on: null, created_at: '2026-09-01T10:00:00Z' }
const page = () => render(<MemoryRouter><AdminStories session={{ user: { id: 'gill' } }} /></MemoryRouter>)
beforeEach(() => { Object.assign(h, { stories: [story], rows: [{ story_id: STORY_ID, number: 1, post_id: POST_ID }], posts: [{ id: POST_ID, title: 'The beginning' }], owner: true, calls: [], failSave: false }); vi.spyOn(window, 'confirm').mockReturnValue(true) })

describe('who may use it', () => {
  it('is for the owner only', () => {
    h.owner = false; page(); expect(screen.getByText('This area is for the site owner.')).toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Add the story' })).toBeNull()
  })
})

describe('adding and changing a story', () => {
  it('checks the story first, in plain words, and saves nothing while it is wrong', async () => {
    page(); fireEvent.click(await screen.findByRole('button', { name: 'Add the story' }))
    expect((await screen.findAllByText('Give the story a title.')).length).toBeGreaterThan(0); expect(h.calls).toHaveLength(0)
  })
  it('adds a story with an address name made from its title, and says so', async () => {
    page(); await screen.findByText('Your stories (1)')
    await userEvent.type(screen.getByLabelText('Title'), 'The Fox & the Moon'); await userEvent.type(screen.getByLabelText(/The first lines/), 'Once there was a fox.')
    fireEvent.click(screen.getByRole('button', { name: 'Add the story' }))
    expect(await screen.findByText('Added \u201cThe Fox & the Moon\u201d.')).toBeInTheDocument()
    expect(h.calls[0]).toEqual(['saveStory', null, { slug: 'the-fox-and-the-moon', title: 'The Fox & the Moon', teaser: 'Once there was a fox.', picture_url: null, status: 'running', finished_on: null }])
  })
  it('asks for the finishing date of a finished story', async () => {
    page(); await screen.findByText('Your stories (1)')
    await userEvent.type(screen.getByLabelText('Title'), 'Done'); await userEvent.selectOptions(screen.getByLabelText('Where is the story?'), 'completed'); fireEvent.click(screen.getByRole('button', { name: 'Add the story' }))
    expect((await screen.findAllByText('Say when the story was finished.')).length).toBeGreaterThan(0); expect(h.calls).toHaveLength(0)
  })
  it('changes an existing story: its details come into the form, and saving updates that story', async () => {
    page(); fireEvent.click(await screen.findByRole('button', { name: 'Change' }))
    expect(screen.getByLabelText('Title')).toHaveValue('The Lantern'); expect(screen.getByLabelText('Picture address (optional)')).toHaveValue('https://img.example.com/a.jpg'); expect(screen.getByRole('heading', { level: 2, name: 'Change this story' })).toBeInTheDocument()
    await userEvent.clear(screen.getByLabelText('Title')); await userEvent.type(screen.getByLabelText('Title'), 'The Lantern Returns'); fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Saved your changes.')).toBeInTheDocument(); expect(h.calls[0][0]).toBe('saveStory'); expect(h.calls[0][1]).toBe(STORY_ID); expect(h.calls[0][2].title).toBe('The Lantern Returns')
  })
  it('deletes a story only after asking', async () => {
    window.confirm.mockReturnValue(false); page(); fireEvent.click(await screen.findByRole('button', { name: 'Delete' })); expect(h.calls).toHaveLength(0)
    window.confirm.mockReturnValue(true); fireEvent.click(screen.getByRole('button', { name: 'Delete' })); await waitFor(() => expect(h.calls).toEqual([['removeStory', STORY_ID]]))
  })
})

describe('making a post a chapter', () => {
  it('lists the story\u2019s chapters with their post titles', async () => {
    page(); expect(await screen.findByText(/Chapter 1: The beginning/)).toBeInTheDocument(); expect(screen.getByText('Still being written · 1 chapter')).toBeInTheDocument()
  })
  it('checks the chapter first: a story, a number and a post address', async () => {
    page(); await screen.findByText('Your stories (1)'); fireEvent.click(screen.getByRole('button', { name: 'Save the chapter' }))
    expect((await screen.findAllByText('Choose the story this chapter belongs to.')).length).toBeGreaterThan(0); expect(screen.getAllByText(/Paste the address of the post/).length).toBeGreaterThan(0); expect(h.calls).toHaveLength(0)
  })
  it('saves the chapter from a pasted post address, and gets ready for the next number', async () => {
    page(); await screen.findByText('Your stories (1)')
    await userEvent.selectOptions(screen.getByLabelText('Story'), STORY_ID); await userEvent.type(screen.getByLabelText('Chapter number'), '2'); await userEvent.type(screen.getByLabelText('The post'), `https://starscapesfactory.com/post/${POST_ID}`)
    fireEvent.click(screen.getByRole('button', { name: 'Save the chapter' }))
    expect(await screen.findByText('Chapter 2 is saved.')).toBeInTheDocument(); expect(h.calls[0]).toEqual(['saveChapter', { story_id: STORY_ID, number: 2, post_id: POST_ID }])
    expect(screen.getByLabelText('Chapter number')).toHaveValue(3); expect(screen.getByLabelText('The post')).toHaveValue(''); expect(screen.getByLabelText('Story')).toHaveValue(STORY_ID)
  })
  it('takes a chapter out of a story only after asking, and says the post itself stays', async () => {
    window.confirm.mockReturnValue(false); page(); fireEvent.click(await screen.findByRole('button', { name: /Take chapter 1 of The Lantern out of the story/ })); expect(h.calls).toHaveLength(0)
    expect(window.confirm.mock.calls[0][0]).toMatch(/The post itself stays/)
    window.confirm.mockReturnValue(true); fireEvent.click(screen.getByRole('button', { name: /Take chapter 1 of The Lantern out of the story/ })); await waitFor(() => expect(h.calls).toEqual([['removeChapter', STORY_ID, 1]]))
  })
})

describe('when the database says no', () => {
  it('says plainly what went wrong, and does not say it worked', async () => {
    h.failSave = true; page(); await screen.findByText('Your stories (1)')
    await userEvent.type(screen.getByLabelText('Title'), 'Another'); fireEvent.click(screen.getByRole('button', { name: 'Add the story' }))
    expect(await screen.findByText('Only the site owner can change the stories.')).toBeInTheDocument(); expect(screen.queryByText(/Added/)).toBeNull()
  })
  it('says plainly when a post is already a chapter somewhere else', async () => {
    h.failSave = true; page(); await screen.findByText('Your stories (1)')
    await userEvent.selectOptions(screen.getByLabelText('Story'), STORY_ID); await userEvent.type(screen.getByLabelText('Chapter number'), '2'); await userEvent.type(screen.getByLabelText('The post'), POST_ID)
    fireEvent.click(screen.getByRole('button', { name: 'Save the chapter' })); expect(await screen.findByText(/already a chapter of a story/)).toBeInTheDocument(); expect(screen.queryByText(/is saved/)).toBeNull()
  })
})
